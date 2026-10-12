import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  STATI_DA_ANONIMIZZARE,
  datiAnonimi,
  limite,
  mesiConservazione,
} from './conservazione';

/**
 * Job notturno: anonimizza i lead non diventati clienti piu' vecchi di LEAD_RETENTION_MESI (default 12).
 * Azzera anche IP/user agent salvati negli eventi delle azioni. Gli APPROVATI restano (prova del consenso).
 */
@Injectable()
export class ConservazioneLeadService {
  private readonly logger = new Logger(ConservazioneLeadService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(process.env.LEAD_RETENTION_CRON || '30 3 * * *')
  async anonimizzaScaduti(): Promise<number> {
    const mesi = mesiConservazione();
    const prima = limite(mesi);
    const leads = await this.prisma.lead.findMany({
      where: {
        anonimizzatoIl: null,
        stato: { in: STATI_DA_ANONIMIZZARE },
        OR: [
          { decisioneIl: { lt: prima } },
          { decisioneIl: null, createdAt: { lt: prima } },
        ],
      },
      select: { id: true, report: true },
      take: 500,
    });
    for (const l of leads) {
      const { report, ...campi } = datiAnonimi(l.report);
      await this.prisma.$transaction([
        this.prisma.lead.update({
          where: { id: l.id },
          data: {
            ...campi,
            report: report ? (report as Prisma.InputJsonValue) : Prisma.DbNull,
            anonimizzatoIl: new Date(),
          },
        }),
        // Negli eventi azione_* ci sono IP e user agent di chi ha cliccato.
        this.prisma.leadEvent.updateMany({
          where: { leadId: l.id, tipo: { startsWith: 'azione_' } },
          data: { dettagli: Prisma.DbNull },
        }),
        this.prisma.leadEvent.create({
          data: { leadId: l.id, tipo: 'anonimizzato', dettagli: { mesi } },
        }),
      ]);
    }
    if (leads.length)
      this.logger.log(`Anonimizzati ${leads.length} lead oltre ${mesi} mesi`);
    return leads.length;
  }
}
