import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { IndagineService } from './indagine.service';
import type { ReportIndagine } from './indagine';
import type { Lead, Prisma } from '@prisma/client';

/** Versione del testo privacy accettato nel form vetrina: aggiornarla quando cambia l'informativa. */
const PRIVACY_VERSIONE = process.env.PRIVACY_VERSIONE ?? '2026-10';

const pulisci = (s?: string) => (s?.trim() ? s.trim() : null);

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly indagine: IndagineService,
  ) {}

  /** Salva il lead e notifica shop@ (best-effort: la richiesta resta salvata anche se la mail fallisce). */
  async crea(
    dto: CreateLeadDto,
    ip: string | null,
    userAgent: string | null,
  ): Promise<{ id: number }> {
    const lead = await this.prisma.lead.create({
      data: {
        ragioneSociale: dto.ragioneSociale.trim(),
        partitaIva: dto.partitaIva.trim().toUpperCase(),
        codiceFiscale: pulisci(dto.codiceFiscale)?.toUpperCase() ?? null,
        referente: dto.referente.trim(),
        tipoAttivita: dto.tipoAttivita ?? null,
        email: dto.email.trim().toLowerCase(),
        telefono: pulisci(dto.telefono),
        citta: pulisci(dto.citta),
        messaggio: pulisci(dto.messaggio),
        lingua: dto.lingua,
        privacyAccettataIl: new Date(),
        privacyVersione: PRIVACY_VERSIONE,
        ip,
        userAgent: userAgent?.slice(0, 300) ?? null,
        eventi: { create: { tipo: 'creato' } },
      },
    });

    // Indagine + mail in background: il visitatore riceve subito la conferma.
    void this.qualifica(lead);

    return { id: lead.id };
  }

  /** Indagine AI (fail closed: errori → VERIFICARE) e poi mail a shop@ con il report. */
  private async qualifica(lead: Lead) {
    let report: ReportIndagine | null = null;
    try {
      report = await this.indagine.indaga(lead);
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: {
          verdetto: report.verdetto,
          report: report as unknown as Prisma.InputJsonValue,
          indagineIl: new Date(),
        },
      });
      await this.evento(lead.id, 'indagine', {
        verdetto: report.verdetto,
        durataMs: report.durataMs,
        errore: report.errore,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Indagine lead #${lead.id} fallita: ${msg}`);
      await this.evento(lead.id, 'indagine_errore', { errore: msg });
    }

    try {
      await this.mail.sendSegnalazioneLead({ ...lead, report });
      await this.evento(lead.id, 'mail_inviata');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Mail lead #${lead.id} non inviata: ${msg}`);
      await this.evento(lead.id, 'mail_errore', { errore: msg });
    }
  }

  private evento(leadId: number, tipo: string, dettagli?: object) {
    return this.prisma.leadEvent
      .create({ data: { leadId, tipo, dettagli } })
      .catch(() => undefined);
  }
}
