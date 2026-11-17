import { Injectable, Logger } from '@nestjs/common';
import * as path from 'node:path';
import type { Customer, Lead } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { cartellaOrdiniIntegra, scriviXlsxDaModello } from '../common/xlsx';
import {
  MODELLO_SOGGETTI,
  RIGHE_INTESTAZIONE_MODELLO,
  anagraficaDaCliente,
  anagraficaDaLead,
  campiObbligatoriMancanti,
  nomeFileLead,
  valoriCliente,
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
    const file = nomeFileLead(lead);
    const valori = valoriCliente(anagraficaDaLead(lead));
    const mancanti = campiObbligatoriMancanti(valori);
    if (mancanti.length) {
      // File non scritto: un tracciato senza i campi obbligatori verrebbe rifiutato
      // dall'import, e intanto occupa la cartella monitorata da Integra.
      const errore = `Campi obbligatori mancanti: ${mancanti.join(', ')}`;
      await this.prisma.leadEvent.create({
        data: { leadId: lead.id, tipo: 'export_errore', dettagli: { errore, campi: mancanti } },
      });
      return { ok: false, errore };
    }
    try {
      await scriviXlsxDaModello(
        this.dir,
        file,
        path.join(process.cwd(), MODELLO_SOGGETTI),
        RIGHE_INTESTAZIONE_MODELLO,
        [valori],
      );
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

  /**
   * Riesportazione di un cliente gia' in Integra (codice compilato: Integra aggiorna, aggancio per P.IVA)
   * dopo la conferma o la modifica dei dati di fatturazione. Un file per invio, nome con data/ora.
   */
  async riesportaCliente(c: Customer): Promise<EsitoExport> {
    const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const file = `cliente-${(c.codiceCliente ?? `id${c.id}`).replace(/[^A-Za-z0-9_-]/g, '_')}-${ts}.xlsx`;
    const valori = valoriCliente(anagraficaDaCliente(c));
    const mancanti = campiObbligatoriMancanti(valori);
    if (mancanti.length) {
      return { ok: false, errore: `Campi obbligatori mancanti: ${mancanti.join(', ')}` };
    }
    try {
      await scriviXlsxDaModello(
        this.dir,
        file,
        path.join(process.cwd(), MODELLO_SOGGETTI),
        RIGHE_INTESTAZIONE_MODELLO,
        [valori],
      );
      if (c.leadId)
        await this.prisma.leadEvent.create({
          data: {
            leadId: c.leadId,
            tipo: 'riesportazione_integra',
            dettagli: { file },
          },
        });
      return {
        ok: true,
        file,
        giaEsportato: false,
        sedeMancante: !c.indirizzo || !c.cap,
      };
    } catch (e: unknown) {
      const errore = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Riesportazione cliente #${c.id} fallita: ${errore}`);
      return { ok: false, errore };
    }
  }
}
