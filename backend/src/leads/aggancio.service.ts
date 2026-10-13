import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrazioneService } from '../integrazione/integrazione.service';
import { CustomersService } from '../customers/customers.service';

/**
 * Fase 5: lead APPROVATO → (AGOMIR importa l'anagrafica in Integra) → cliente B2B + invito.
 * Ogni 15 minuti cerca in integra_clienti (sincronizzata dal sync) la P.IVA dei lead approvati
 * non ancora collegati; se la trova riusa importaClienti() e invita(). Solo i clienti nati da
 * un lead vengono invitati in automatico, mai quelli importati con il processo esistente.
 */
@Injectable()
export class AggancioLeadService {
  private readonly logger = new Logger(AggancioLeadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrazione: IntegrazioneService,
    private readonly customers: CustomersService,
  ) {}

  @Cron(process.env.LEAD_AGGANCIO_CRON || '*/15 * * * *')
  async agganciaApprovati(): Promise<number> {
    const leads = await this.prisma.lead.findMany({
      where: { stato: 'APPROVATO', cliente: null, anonimizzatoIl: null },
      select: { id: true, partitaIva: true, codiceFiscale: true },
    });
    let collegati = 0;
    for (const lead of leads) {
      try {
        if (await this.aggancia(lead)) collegati++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Aggancio lead #${lead.id} fallito: ${msg}`);
        await this.evento(lead.id, 'aggancio_errore', { errore: msg });
      }
    }
    return collegati;
  }

  private async aggancia(lead: {
    id: number;
    partitaIva: string;
    codiceFiscale: string | null;
  }): Promise<boolean> {
    // P.IVA confrontata sulle sole cifre: in Integra puo' avere prefisso IT o spazi.
    const righe = await this.prisma.$queryRaw<{ codice_cliente: string }[]>`
      SELECT codice_cliente FROM integra_clienti
      WHERE regexp_replace(coalesce(partita_iva, ''), '[^0-9]', '', 'g') = ${lead.partitaIva}
        AND coalesce(cli_obsoleto, 0) = 0
      ORDER BY data_modifica DESC NULLS LAST
      LIMIT 1`;
    const codice = righe[0]?.codice_cliente?.trim();
    if (!codice) return false; // non ancora importato in Integra: si riprova al prossimo giro

    const gia = await this.prisma.customer.findUnique({
      where: { codiceCliente: codice },
    });
    if (gia?.leadId && gia.leadId !== lead.id) {
      await this.evento(lead.id, 'aggancio_conflitto', {
        codiceCliente: codice,
        altroLead: gia.leadId,
      });
      return false;
    }

    await this.integrazione.importaClienti([codice]);
    const cliente = await this.prisma.customer.findUnique({
      where: { codiceCliente: codice },
    });
    if (!cliente) {
      // importaClienti salta i clienti senza email in Integra: senza email non si puo' invitare.
      await this.eventoUnaVolta(lead.id, 'aggancio_senza_email', {
        codiceCliente: codice,
      });
      return false;
    }

    await this.prisma.customer.update({
      where: { id: cliente.id },
      data: {
        leadId: lead.id,
        codiceFiscale: cliente.codiceFiscale ?? lead.codiceFiscale,
      },
    });
    await this.evento(lead.id, 'cliente_collegato', {
      codiceCliente: codice,
      customerId: cliente.id,
    });

    // Cliente gia' esistente e gia' invitato (es. creato a mano): nessun nuovo invito.
    if (cliente.invitatoAt) return true;
    try {
      await this.customers.invita(null, cliente.id, undefined);
      await this.evento(lead.id, 'invito_inviato', { customerId: cliente.id });
    } catch (e: unknown) {
      await this.evento(lead.id, 'invito_errore', {
        errore: e instanceof Error ? e.message : String(e),
      });
    }
    return true;
  }

  private evento(leadId: number, tipo: string, dettagli?: object) {
    return this.prisma.leadEvent
      .create({ data: { leadId, tipo, dettagli } })
      .catch(() => undefined);
  }

  /** Per le condizioni che si ripresentano a ogni giro: un solo evento, niente rumore. */
  private async eventoUnaVolta(leadId: number, tipo: string, dettagli: object) {
    const c = await this.prisma.leadEvent.count({ where: { leadId, tipo } });
    if (!c) await this.evento(leadId, tipo, dettagli);
  }
}
