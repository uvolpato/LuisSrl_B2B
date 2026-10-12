import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateLeadDto } from './dto/create-lead.dto';

/** Versione del testo privacy accettato nel form vetrina: aggiornarla quando cambia l'informativa. */
const PRIVACY_VERSIONE = process.env.PRIVACY_VERSIONE ?? '2026-10';

const pulisci = (s?: string) => (s?.trim() ? s.trim() : null);

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
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

    void this.mail
      .sendSegnalazioneLead(lead)
      .then(() => this.evento(lead.id, 'mail_inviata'))
      .catch((e: unknown) => {
        this.logger.warn(
          `Mail lead #${lead.id} non inviata: ${e instanceof Error ? e.message : String(e)}`,
        );
        return this.evento(lead.id, 'mail_errore', {
          errore: e instanceof Error ? e.message : String(e),
        });
      });

    return { id: lead.id };
  }

  private evento(leadId: number, tipo: string, dettagli?: object) {
    return this.prisma.leadEvent
      .create({ data: { leadId, tipo, dettagli } })
      .catch(() => undefined);
  }
}
