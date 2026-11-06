import { Injectable, Logger } from '@nestjs/common';
import type { Lead, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ExportClienteService,
  type EsitoExport,
} from './export-cliente.service';
import { AggancioLeadService, type ClienteIntegra } from './aggancio.service';
import { emailAccesso } from './email-integra';
import {
  AZIONI,
  TRANSIZIONI,
  TTL_MS,
  firma,
  segretoAzioni,
  verificaToken,
  type Azione,
} from './azioni';

export type EsitoAzione =
  | { tipo: 'conferma'; lead: Lead; azione: Azione }
  | {
      tipo: 'eseguita';
      lead: Lead;
      azione: Azione;
      export?: EsitoExport;
      inIntegra?: boolean;
    }
  | { tipo: 'gia_fatta'; lead: Lead; azione: Azione }
  | { tipo: 'errore'; motivo: 'invalido' | 'scaduto' | 'inesistente' };

type Parametri = { l?: unknown; a?: unknown; e?: unknown; s?: unknown };

/** Pulsanti Approva/Verifica/Scarta della mail lead: link firmati, TTL 7 giorni, decisioni finali non ripetibili. */
@Injectable()
export class AzioniLeadService {
  private readonly logger = new Logger(AzioniLeadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly exportCliente: ExportClienteService,
    private readonly aggancio: AggancioLeadService,
  ) {}

  /** URL dei tre pulsanti. Passano dal dominio del portale (APP_DOMAIN), che proxa /api al backend. */
  link(leadId: number): Record<Azione, string> {
    const base = (process.env.APP_DOMAIN ?? 'http://localhost:3000').replace(
      /\/+$/,
      '',
    );
    const scadenza = Date.now() + TTL_MS;
    const segreto = segretoAzioni();
    return Object.fromEntries(
      AZIONI.map((a) => {
        const q = new URLSearchParams({
          l: String(leadId),
          a,
          e: String(scadenza),
          s: firma(leadId, a, scadenza, segreto),
        });
        return [a, `${base}/api/leads/azione?${q}`];
      }),
    ) as Record<Azione, string>;
  }

  /** GET: solo lettura, mostra cosa si sta per fare (i client mail aprono i link da soli). */
  async anteprima(p: Parametri): Promise<EsitoAzione> {
    const t = verificaToken(p, segretoAzioni());
    if (!t.ok) return { tipo: 'errore', motivo: t.motivo };
    const lead = await this.prisma.lead.findUnique({ where: { id: t.leadId } });
    if (!lead) return { tipo: 'errore', motivo: 'inesistente' };
    const ammessa = TRANSIZIONI[t.azione].da.includes(lead.stato);
    return { tipo: ammessa ? 'conferma' : 'gia_fatta', lead, azione: t.azione };
  }

  /** POST dal link della mail: verifica la firma, poi applica la transizione. */
  async esegui(
    p: Parametri,
    ip: string | null,
    userAgent: string | null,
  ): Promise<EsitoAzione> {
    const t = verificaToken(p, segretoAzioni());
    if (!t.ok) return { tipo: 'errore', motivo: t.motivo };
    return this.applica(t.leadId, t.azione, {
      ip,
      userAgent: userAgent?.slice(0, 300) ?? null,
    });
  }

  /**
   * Transizione atomica condivisa da link mail e area admin (doppio click o decisione gia' presa →
   * gia_fatta). Le richieste anonimizzate non si modificano.
   */
  async applica(
    leadId: number,
    azione: Azione,
    dettagli: Prisma.InputJsonObject,
  ): Promise<EsitoAzione> {
    const { da, a } = TRANSIZIONI[azione];
    const finale = azione !== 'verifica';
    const res = await this.prisma.lead.updateMany({
      where: { id: leadId, stato: { in: da }, anonimizzatoIl: null },
      data: { stato: a, ...(finale ? { decisioneIl: new Date() } : {}) },
    });
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { tipo: 'errore', motivo: 'inesistente' };
    if (res.count === 0) return { tipo: 'gia_fatta', lead, azione };
    await this.prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        tipo: `azione_${azione}`,
        dettagli: dettagli,
      },
    });
    return {
      tipo: 'eseguita',
      lead,
      azione,
      ...(await this.esitoApprovazione(lead, azione)),
    };
  }

  /**
   * Se la P.IVA e' gia' in Integra il cliente si importa cosi' com'e' (niente file anagrafica:
   * creerebbe un secondo soggetto). Altrimenti si genera il file per Integra come prima,
   * best-effort: l'approvazione resta valida anche se il file fallisce.
   */
  private async esitoApprovazione(
    lead: Lead,
    azione: Azione,
  ): Promise<{ export?: EsitoExport; inIntegra?: boolean }> {
    if (azione !== 'approva') return {};
    let trovato: ClienteIntegra | null = null;
    try {
      trovato = await this.aggancio.cercaPerPiva(lead.partitaIva);
    } catch (e: unknown) {
      // Verifica non disponibile: si prosegue come prima, senza bloccare l'approvazione.
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        `Verifica Integra per il lead #${lead.id} fallita: ${msg}`,
      );
    }
    if (!trovato)
      return {
        export: await this.exportCliente.esporta(lead),
        inIntegra: false,
      };

    const { diversa, daRichiesta } = emailAccesso(trovato.email, lead.email);
    await this.evento(lead.id, 'cliente_integra', {
      codiceCliente: trovato.codiceCliente,
      emailIntegra: trovato.email,
      emailRichiesta: lead.email,
    });
    if (diversa)
      await this.evento(lead.id, 'email_diversa', {
        integra: trovato.email,
        richiesta: lead.email,
      });
    else if (daRichiesta)
      await this.evento(lead.id, 'email_da_richiesta', {
        richiesta: lead.email,
      });
    return { inIntegra: true };
  }

  private evento(leadId: number, tipo: string, dettagli: object) {
    return this.prisma.leadEvent
      .create({ data: { leadId, tipo, dettagli } })
      .catch(() => undefined);
  }
}
