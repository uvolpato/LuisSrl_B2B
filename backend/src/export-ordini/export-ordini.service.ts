import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Export degli ordini B2B verso Integra: un file .xlsx per ordine, sul tracciato
 * di import concordato (27 colonne, testata mvt_* ripetuta su ogni riga).
 * Specifica completa: prisma/ordini-fdw-spec.md
 *
 *   EXPORT_ORDINI_DIR   cartella monitorata da Integra. Default: <progetto>/ordini
 *                       (in produzione si punta alla cartella concordata con AGOMIR).
 *   EXPORT_ORDINI_CRON  frequenza del job (default ogni 10 minuti).
 *
 * Idempotenza: si esporta solo cio' che ha esportato_il IS NULL; dopo il
 * successo la colonna e' valorizzata e l'ordine non viene mai riesportato.
 */

/** Intestazioni del tracciato, nell'ordine A..AA. Riprodotte identiche al modello
 *  fornito (inclusa la colonna O, che nell'originale ha uno spazio e non l'underscore). */
const COLONNE = [
  'mvt_mdtcod', 'mvt_dtmov', 'mvt_mvnserie', 'mvt_num', 'mvt_clatipo', 'mvt_clacodstr',
  'mvt_valcod', 'mvt_pagcod', 'mvt_specod', 'mvt_porcod', 'mvt_dtconr', 'mvt_ivacod',
  'mvt_tlscod', 'mvt_vsrif', 'mvt dtvsrif', 'mvt_iban', 'mvr_ordinamento', 'mvr_procod',
  'mvr_descr', 'mvr_umicod', 'mvr_qta', 'mvr_przval', 'mvr_dtconr', 'mvr_ivacod',
  'mvr_mvgcod', 'mvr_magcod', 'mvr_comcod',
] as const;

// Costanti del tracciato (§3 della specifica).
const TIPO_DOCUMENTO = 'OC0000';
const SERIE = 'OC';
const NUMERO_DOCUMENTO = 999999; // fisso: la chiave di collegamento e' mvt_vsrif, non questo
const TIPO_SOGGETTO = 'C';
const VALUTA = 'EUR';
const TIPO_RIGA = 'OC0000';
const MAGAZZINO = '001';
const PASSO_ORDINAMENTO = 5; // mvr_ordinamento: 5, 10, 15, ...


export interface EsitoOrdine {
  ordineId: number;
  numeroOrdine: string;
  stato: 'ESPORTATO' | 'ERRORE_NO_CLIENTE' | 'ERRORE_PRODOTTO' | 'ERRORE_SCRITTURA';
  file?: string;
  righe?: number;
  righeEscluse?: number;
  errore?: string;
}

export interface ReportExport {
  attivo: boolean;
  cartella: string;
  dryRun: boolean;
  processati: number;
  esportati: number;
  errori: number;
  ordini: EsitoOrdine[];
}

@Injectable()
export class ExportOrdiniService {
  private readonly log = new Logger(ExportOrdiniService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Cartella di destinazione. Il backend gira sempre con cwd = backend/ (in produzione
   *  AppDirectory del servizio, vedi setup-services.cmd), quindi il default e' <progetto>/ordini. */
  private get dir(): string {
    return process.env.EXPORT_ORDINI_DIR?.trim() || path.resolve(process.cwd(), '..', 'ordini');
  }

  @Cron(process.env.EXPORT_ORDINI_CRON || '*/10 * * * *')
  async jobSchedulato(): Promise<void> {
    const r = await this.esportaCoda();
    if (r.processati) {
      this.log.log(`Export ordini: ${r.esportati}/${r.processati} esportati, ${r.errori} errori`);
    }
  }

  /** Ordini candidati: mai esportati, confermati o rimasti indietro per un errore di scrittura. */
  private async coda() {
    return this.prisma.ordineCliente.findMany({
      where: {
        esportatoIl: null,
        numeroOrdine: { startsWith: 'B2B-' },
        stato: { in: ['BOZZA', 'ERRORE_SCRITTURA'] },
      },
      include: {
        righe: { orderBy: { id: 'asc' } },
        customer: { select: { codiceCliente: true, codiceListino: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  /**
   * Svuota la coda. Con dryRun non scrive nulla e non marca niente: serve a
   * vedere cosa uscirebbe (e quali ordini sono in errore) prima di farlo davvero.
   */
  async esportaCoda(dryRun = false): Promise<ReportExport> {
    const report: ReportExport = {
      attivo: true, cartella: this.dir, dryRun, processati: 0, esportati: 0, errori: 0, ordini: [],
    };

    // Job schedulato e pulsante manuale non devono pestarsi i piedi.
    // ponytail: guardia in-process, come il batch notturno dei box (dashboard.service).
    // Basta perche' il backend gira come istanza singola; se un giorno viene replicato
    // serve pg_advisory_xact_lock DENTRO una transazione — la variante di sessione non
    // va usata con Prisma, perche' col pool lock e unlock finiscono su connessioni diverse.
    if (this.running) {
      this.log.warn('Export ordini gia\' in esecuzione, salto il run');
      return report;
    }
    this.running = true;

    try {
      for (const ordine of await this.coda()) {
        const esito = await this.esportaOrdine(ordine, dryRun);
        report.ordini.push(esito);
        report.processati++;
        if (esito.stato === 'ESPORTATO') report.esportati++;
        else report.errori++;
      }
      return report;
    } finally {
      this.running = false;
    }
  }

  private async esportaOrdine(
    ordine: Awaited<ReturnType<ExportOrdiniService['coda']>>[number],
    dryRun: boolean,
  ): Promise<EsitoOrdine> {
    const base = { ordineId: ordine.id, numeroOrdine: ordine.numeroOrdine };

    const codiceCliente = ordine.customer?.codiceCliente?.trim();
    if (!codiceCliente) {
      return this.fallisci(ordine.id, { ...base, stato: 'ERRORE_NO_CLIENTE', errore: 'Cliente senza codice Integra' }, dryRun);
    }

    // Le righe coupon hanno prezzo negativo e come codice prodotto il codice campagna,
    // che in Integra non esiste: mvr_procod e' obbligatorio e farebbe fallire l'import.
    // Le escludiamo e lo dichiariamo nell'esito (mai in silenzio). Vedi specifica §5.3.
    const valide = ordine.righe.filter((r) => r.codiceProdotto?.trim() && Number(r.prezzo ?? 0) >= 0);
    const escluse = ordine.righe.length - valide.length;
    if (!valide.length) {
      return this.fallisci(ordine.id, { ...base, stato: 'ERRORE_PRODOTTO', errore: 'Nessuna riga esportabile' }, dryRun);
    }

    const dataOrdine = this.fmtData(ordine.dataOrdine);
    const righe = valide.map((r, i) => [
      TIPO_DOCUMENTO,                        // A  mvt_mdtcod
      dataOrdine,                            // B  mvt_dtmov
      SERIE,                                 // C  mvt_mvnserie
      NUMERO_DOCUMENTO,                      // D  mvt_num
      TIPO_SOGGETTO,                         // E  mvt_clatipo
      codiceCliente,                         // F  mvt_clacodstr
      VALUTA,                                // G  mvt_valcod
      '',                                    // H  mvt_pagcod  -> anagrafica cliente
      ordine.codiceSpedizione ?? '',         // I  mvt_specod
      ordine.codicePorto ?? '',              // J  mvt_porcod
      '',                                    // K  mvt_dtconr
      '',                                    // L  mvt_ivacod
      ordine.customer?.codiceListino ?? '',  // M  mvt_tlscod
      ordine.numeroOrdine,                   // N  mvt_vsrif   <- chiave di riconciliazione
      dataOrdine,                            // O  mvt dtvsrif
      '',                                    // P  mvt_iban
      (i + 1) * PASSO_ORDINAMENTO,           // Q  mvr_ordinamento
      r.codiceProdotto ?? '',                // R  mvr_procod (garantito non vuoto dal filtro sopra)
      r.descrizione ?? '',                   // S  mvr_descr
      '',                                    // T  mvr_umicod  -> anagrafica prodotto
      Number(r.quantita ?? 0),               // U  mvr_qta
      Number(r.prezzo ?? 0),                 // V  mvr_przval
      '',                                    // W  mvr_dtconr
      '',                                    // X  mvr_ivacod
      TIPO_RIGA,                             // Y  mvr_mvgcod
      MAGAZZINO,                             // Z  mvr_magcod
      '',                                    // AA mvr_comcod
    ]);

    const nomeFile = `${ordine.numeroOrdine.replace(/[^A-Za-z0-9._-]/g, '_')}.xlsx`;
    if (dryRun) {
      return { ...base, stato: 'ESPORTATO', file: nomeFile, righe: righe.length, righeEscluse: escluse };
    }

    try {
      await this.scrivi(nomeFile, righe);
    } catch (e) {
      const errore = (e as Error).message;
      this.log.error(`Ordine ${ordine.numeroOrdine}: scrittura fallita — ${errore}`);
      return this.fallisci(ordine.id, { ...base, stato: 'ERRORE_SCRITTURA', errore }, dryRun);
    }

    await this.prisma.ordineCliente.update({
      where: { id: ordine.id },
      data: { esportatoIl: new Date(), esportatoFile: nomeFile, stato: 'ESPORTATO' },
    });
    void this.audit.log({
      azione: 'ordine.export', entita: 'ordine', entitaId: ordine.numeroOrdine,
      dettagli: { file: nomeFile, righe: righe.length, righeEscluse: escluse },
    });

    return { ...base, stato: 'ESPORTATO', file: nomeFile, righe: righe.length, righeEscluse: escluse };
  }

  /** Scrive su nome temporaneo e poi rinomina: Integra non deve mai leggere un file a meta'. */
  private async scrivi(nomeFile: string, righe: (string | number)[][]): Promise<void> {
    const dir = this.dir;
    await fs.mkdir(dir, { recursive: true });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Foglio1');
    ws.addRow([...COLONNE]);
    for (const r of righe) ws.addRow(r);

    const finale = path.join(dir, nomeFile);
    const tmp = path.join(dir, `.${nomeFile}.tmp`);
    await wb.xlsx.writeFile(tmp);
    await fs.rename(tmp, finale);
  }

  private async fallisci(ordineId: number, esito: EsitoOrdine, dryRun: boolean): Promise<EsitoOrdine> {
    if (!dryRun) {
      await this.prisma.ordineCliente.update({ where: { id: ordineId }, data: { stato: esito.stato } });
      void this.audit.log({
        azione: 'ordine.export', entita: 'ordine', entitaId: esito.numeroOrdine,
        esito: 'KO', dettagli: { stato: esito.stato, errore: esito.errore },
      });
    }
    return esito;
  }

  /** Il tracciato vuole gg/mm/aaaa (es. 31/03/2026): stringa, per non dipendere dal locale di Excel. */
  private fmtData(d: Date | null): string {
    const x = d ?? new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(x.getDate())}/${p(x.getMonth() + 1)}/${x.getFullYear()}`;
  }
}
