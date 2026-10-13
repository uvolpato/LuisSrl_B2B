import { Injectable, Logger } from '@nestjs/common';
import type { Lead } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { cartellaOrdiniIntegra, scriviXlsxAtomico } from '../common/xlsx';
import {
  COLONNE_CLIENTI,
  anagraficaDaLead,
  rigaCliente,
} from './export-cliente';

export type EsitoExport =
  | { ok: true; file: string; giaEsportato: boolean; sedeMancante: boolean }
  | { ok: false; errore: string };

/**
 * Fase 4: anagrafica del lead approvato → lead-<id>.xlsx nella cartella monitorata da Integra.
 *   IMPORT_CLIENTI_DIR   cartella import clienti (default: la stessa degli ordini, EXPORT_ORDINI_DIR)
 * Idempotente: un lead gia' esportato non viene riscritto.
 */
@Injectable()
export class ExportClienteService {
  private readonly logger = new Logger(ExportClienteService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get dir(): string {
    return process.env.IMPORT_CLIENTI_DIR?.trim() || cartellaOrdiniIntegra();
  }

  async esporta(lead: Lead): Promise<EsitoExport> {
    const sedeMancante =
      !lead.sedeIndirizzo ||
      !lead.sedeCap ||
      !lead.sedeCitta ||
      !lead.sedeProvincia;
    if (lead.esportatoFile)
      return {
        ok: true,
        file: lead.esportatoFile,
        giaEsportato: true,
        sedeMancante,
      };
    const file = `lead-${lead.id}.xlsx`;
    try {
      await scriviXlsxAtomico(this.dir, file, [
        [...COLONNE_CLIENTI],
        rigaCliente(anagraficaDaLead(lead)),
      ]);
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { esportatoIl: new Date(), esportatoFile: file },
      });
      await this.prisma.leadEvent.create({
        data: {
          leadId: lead.id,
          tipo: 'export_integra',
          dettagli: { file, cartella: this.dir, sedeMancante },
        },
      });
      return { ok: true, file, giaEsportato: false, sedeMancante };
    } catch (e: unknown) {
      const errore = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Export Integra lead #${lead.id} fallito: ${errore}`);
      await this.prisma.leadEvent.create({
        data: { leadId: lead.id, tipo: 'export_errore', dettagli: { errore } },
      });
      return { ok: false, errore };
    }
  }
}
