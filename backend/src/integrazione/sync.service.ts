import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

export interface SyncResult {
  entity: string;
  status: string;
  rowsTotal: number;
  rowsOk: number;
  rowsError: number;
  errorText?: string;
  durationMs: number;
  progressPct?: number;
  progressPhase?: string;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly FDW_VIEW = 'integra.itgprodotti';

  constructor(private readonly prisma: PrismaService) {}

  /** Cron: ogni 15 minuti (0,15,30,45) */
  @Cron('0 */15 * * * *')
  async syncCron() {
    this.logger.log('Sync automatico avviato');
    await this.sync();
  }

  async sync(): Promise<SyncResult> {
    const startedAt = new Date();
    let logId: number | null = null;

    try {
      logId = await this.startLog('articoli');

      await this.setProgress(logId, 0, 'Avvio sincronizzazione…');

      // Legge tutto dalla FDW con retry (3 tentativi, backoff esponenziale).
      // Se la FDW è giù o lenta, fallisce dopo il timeout lato client (60s per tentativo).
      const rows = await this.withRetry(() =>
        this.withTimeout(
          this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
            `SELECT * FROM ${this.FDW_VIEW}`,
          ),
          60_000,
          'FDW query',
        ),
      );
      await this.setProgress(logId, 5, `Lette ${rows.length} righe dalla vista Integra`);

      const parsed = this.parseRows(rows);
      await this.setProgress(logId, 8, `Parse: ${parsed.famiglie.length} famiglie, ${parsed.linee.length} linee, ${parsed.articoli.length} articoli`);

      if (parsed.articoli.length === 0) {
        throw new Error(
          `Nessun articolo parsato su ${rows.length} righe lette. Verificare la vista Integra.`,
        );
      }

      await this.atomicReplace(parsed, logId);

      const durationMs = Date.now() - startedAt.getTime();
      const totalRows = parsed.famiglie.length + parsed.linee.length + parsed.articoli.length;
      await this.completeLog(logId, 'ok', totalRows, parsed.articoli.length, 0);

      this.logger.log(`Sync completato: ${rows.length} righe lette, ${parsed.famiglie.length} famiglie, ${parsed.linee.length} linee, ${parsed.articoli.length} articoli`);

      return {
        entity: 'articoli',
        status: 'ok',
        rowsTotal: rows.length,
        rowsOk: parsed.articoli.length,
        rowsError: 0,
        durationMs,
        progressPct: 100,
        progressPhase: 'Completato',
      };
    } catch (err) {
      const durationMs = Date.now() - startedAt.getTime();
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Sync fallito: ${msg}`);
      if (logId) await this.failLog(logId, msg);
      return { entity: 'articoli', status: 'failed', rowsTotal: 0, rowsOk: 0, rowsError: 0, errorText: msg, durationMs, progressPct: 0, progressPhase: `Errore: ${msg}` };
    }
  }

  /** Recupera lo stato completo dell'ultima sync (per health check) */
  async getStatus(): Promise<{
    status: string;
    lastRunAt: string | null;
    completedAt: string | null;
    rowsTotal: number;
    rowsOk: number;
    rowsError: number;
    errorText: string | null;
  } | null> {
    try {
      const [row] = await this.prisma.$queryRawUnsafe<{
        status: string; started_at: Date; completed_at: Date | null;
        rows_total: number; rows_ok: number; rows_error: number; error_text: string | null;
      }[]>(`
        SELECT status, started_at, completed_at, rows_total, rows_ok, rows_error, error_text
        FROM sync_log ORDER BY started_at DESC LIMIT 1
      `);
      if (!row) return null;
      return {
        status: row.status,
        lastRunAt: row.started_at.toISOString(),
        completedAt: row.completed_at?.toISOString() ?? null,
        rowsTotal: row.rows_total ?? 0,
        rowsOk: row.rows_ok ?? 0,
        rowsError: row.rows_error ?? 0,
        errorText: row.error_text,
      };
    } catch { return null; }
  }

  /** Recupera il progresso della sync più recente */
  async getProgress(): Promise<{ running: boolean; pct: number; phase: string; errorText?: string } | null> {
    try {
      const [row] = await this.prisma.$queryRawUnsafe<{ status: string; pct: number; phase: string | null; error_text: string | null }[]>(
        `SELECT status, progress_pct AS pct, progress_phase AS phase, error_text
         FROM sync_log ORDER BY started_at DESC LIMIT 1`,
      );
      if (!row) return { running: false, pct: 0, phase: 'Nessuna sync in corso' };
      if (row.status === 'running') return { running: true, pct: row.pct, phase: row.phase ?? 'In corso…' };
      const phase = row.status === 'ok' ? 'Completato' : row.status === 'stale' ? '' : 'Errore';
      return { running: false, pct: 100, phase, errorText: row.error_text ?? undefined };
    } catch {
      return { running: false, pct: 0, phase: 'Errore lettura progresso' };
    }
  }

  /** Esegue fn con retry esponenziale (maxRetries tentativi) */
  private async withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (attempt === maxRetries) throw err;
        const delay = Math.pow(2, attempt) * 1000;
        this.logger.warn(`Tentativo ${attempt + 1}/${maxRetries} fallito, riprovo tra ${delay}ms: ${err instanceof Error ? err.message : err}`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw new Error('Unreachable');
  }

  /** Wrapper che lancia un errore se la promise non si risolve entro ms */
  private withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timeout ${label} dopo ${ms}ms`)), ms);
    });
    return Promise.race([promise.finally(() => clearTimeout(timer!)), timeout]);
  }

  /** Aggiorna il progresso della sync in corso */
  private async setProgress(logId: number, pct: number, phase: string) {
    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE sync_log SET progress_pct = $1, progress_phase = $2 WHERE id = $3`,
        pct, phase, logId,
      );
    } catch { /* ignore errors durante l'aggiornamento progresso */ }
  }

  /** Dà un numero, cercando di parsare la virgola come separatore decimale */
  private parseNumeric(val: unknown): number | null {
    if (val == null || val === '') return null;
    const s = String(val).trim().replace(',', '.').replace(/[^0-9.\-]/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  /** Costruisce una entry dimensione con { codice, descrizione, valore (numerico) } */
  private buildDimEntry(codice: unknown, descrizione: unknown, valore: unknown): Record<string, unknown> | null {
    const c = codice != null ? String(codice).trim() : '';
    const d = descrizione != null ? String(descrizione).trim() : '';
    const v = this.parseNumeric(valore);
    if (!c && !d && v == null) return null;
    const entry: Record<string, unknown> = {};
    if (c) entry.codice = c;
    if (d) entry.descrizione = d;
    if (v != null) entry.valore = v;
    return entry;
  }

  /** Parsa dimensioni fisiche (diametro + altezza) in JSON strutturato */
  private parseDimensione(
    diametroRaw: unknown, descrDiametro: unknown,
    altezzaRaw: unknown, descrAltezza: unknown,
  ): { json: Record<string, unknown> | null; testo: string | null } {
    const dStr = diametroRaw ? String(diametroRaw).trim() : '';
    const aStr = altezzaRaw ? String(altezzaRaw).trim() : '';
    if (!dStr && !aStr) return { json: null, testo: null };

    const testo = [dStr, aStr].filter(Boolean).join(' x ');
    const json: Record<string, unknown> = {};

    const dEntry = this.buildDimEntry(diametroRaw, descrDiametro, diametroRaw);
    if (dEntry) json.diametro = dEntry;

    const aEntry = this.buildDimEntry(altezzaRaw, descrAltezza, altezzaRaw);
    if (aEntry) json.altezza = aEntry;

    return { json: Object.keys(json).length > 0 ? json : null, testo: testo || null };
  }

  private parseRows(rows: Record<string, unknown>[]) {
    // Le relazioni usano cod_famiglia (numerico) e cod_linea (numerico),
    // NON pro_cod (es. FAM_VASI_COTTO_INTER -> cod_famiglia = "90")
    const famiglie = new Map<string, string>();
    const linee = new Map<string, { nome: string; famigliaCodice: string | null }>();
    const articoli: Record<string, unknown>[] = [];

    for (const row of rows) {
      const proCod = String(row.pro_cod ?? '').trim();
      if (!proCod) continue;

      const proDescr = String(row.pro_descr ?? '').trim();
      const up = proCod.toUpperCase();
      const codFamiglia = row.cod_famiglia ? String(row.cod_famiglia).trim() : '';
      const codLinea = row.cod_linea ? String(row.cod_linea).trim() : '';

      if (up.startsWith('FAM_')) {
        // Famiglia: la chiave è cod_famiglia (numerico), non pro_cod
        if (codFamiglia) {
          famiglie.set(codFamiglia, proDescr);
        }
      } else if (proCod.toLowerCase().startsWith('linea_')) {
        // Linea: la chiave è cod_linea (numerico), non pro_cod
        if (codLinea) {
          linee.set(codLinea, { nome: proDescr, famigliaCodice: codFamiglia || null });
        }
      } else {
        const { json: dimJson, testo: dimTesto } = this.parseDimensione(
          row.cod_diametro_esterno,
          row.descr_diametro_esterno,
          row.cod_altezza,
          row.descr_altezza,
        );

        articoli.push({
          pro_cod: proCod,
          pro_descr: proDescr,
          famiglia_codice: codFamiglia || null,
          linea_codice: codLinea || null,
          codice_alternativo: row.codice_alternativo ? String(row.codice_alternativo).trim() : null,
          codice_esterno: row.codice_esterno ? String(row.codice_esterno).trim() : null,
          incluso_b2b: row.incluso_b2b === true || row.incluso_b2b === 'true',
          prodotto_obsoleto: Number(row.prodotto_obsoleto || 0) > 0,
          dimensione_json: dimJson ? JSON.stringify(dimJson) : null,
          dimensione_testo: dimTesto,
          data_ultmod: row.data_ultmod || null,
          multiplo_qta: null,
          unita_misura: null,
          sync_status: 'ok',
          sync_error: null,
        });
      }
    }

    return {
      famiglie: [...famiglie.entries()].map(([codice, nome]) => ({ codice, nome })),
      linee: [...linee.entries()].map(([codice, l]) => ({ codice, nome: l.nome, famiglia_codice: l.famigliaCodice })),
      articoli,
    };
  }

  private async atomicReplace(parsed: {
    famiglie: { codice: string; nome: string }[];
    linee: { codice: string; nome: string; famiglia_codice: string | null }[];
    articoli: Record<string, unknown>[];
  }, logId: number | null) {
    const totalSteps =
      parsed.famiglie.length + parsed.linee.length + parsed.articoli.length || 1;
    let done = 0;
    const BATCH_SIZE = 200;

    // Crea tabelle _new ex-novo. Sono tabelle permanenti, quindi ogni
    // $executeRawUnsafe lavora sulla stessa tabella indipendentemente dalla
    // connessione del pool. L'atomicità è garantita dallo swap finale.
    await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS integra_famiglie_new CASCADE`);
    await this.prisma.$executeRawUnsafe(`CREATE TABLE integra_famiglie_new (LIKE integra_famiglie INCLUDING DEFAULTS)`);
    await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS integra_linee_new CASCADE`);
    await this.prisma.$executeRawUnsafe(`CREATE TABLE integra_linee_new (LIKE integra_linee INCLUDING DEFAULTS)`);
    await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS integra_articoli_new CASCADE`);
    await this.prisma.$executeRawUnsafe(`CREATE TABLE integra_articoli_new (LIKE integra_articoli INCLUDING DEFAULTS)`);
    if (logId) await this.setProgress(logId, 10, 'Tabelle preparate, inserimento dati…');

    // Popola famiglie (batch singolo, sono poche)
    for (const f of parsed.famiglie) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO integra_famiglie_new (codice, nome) VALUES ($1, $2)`,
        f.codice, f.nome,
      );
      done++;
    }
    if (logId) await this.reportProgress(logId, done, totalSteps, 10, 80, 'Famiglie');

    // Popola linee (batch singolo)
    for (const l of parsed.linee) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO integra_linee_new (codice, nome, famiglia_codice) VALUES ($1, $2, $3)`,
        l.codice, l.nome, l.famiglia_codice,
      );
      done++;
    }
    if (logId) await this.reportProgress(logId, done, totalSteps, 10, 80, 'Linee');

    // Popola articoli in batch multi-row per velocità (~100x meno round-trip)
    for (let start = 0; start < parsed.articoli.length; start += BATCH_SIZE) {
      const batch = parsed.articoli.slice(start, start + BATCH_SIZE);
      const placeholders: string[] = [];
      const values: unknown[] = [];
      for (const a of batch) {
        const idx = values.length;
        placeholders.push(`($${idx + 1},$${idx + 2},$${idx + 3},$${idx + 4},$${idx + 5},$${idx + 6},$${idx + 7},$${idx + 8},$${idx + 9}::jsonb,$${idx + 10},$${idx + 11},$${idx + 12},$${idx + 13},$${idx + 14},$${idx + 15})`);
        values.push(
          a.pro_cod, a.pro_descr, a.famiglia_codice, a.linea_codice,
          a.codice_alternativo, a.codice_esterno, a.incluso_b2b, a.prodotto_obsoleto,
          a.dimensione_json, a.dimensione_testo, a.data_ultmod, a.multiplo_qta, a.unita_misura,
          a.sync_status, a.sync_error,
        );
      }
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO integra_articoli_new (pro_cod, pro_descr, famiglia_codice, linea_codice, codice_alternativo, codice_esterno, incluso_b2b, prodotto_obsoleto, dimensione_json, dimensione_testo, data_ultmod, multiplo_qta, unita_misura, sync_status, sync_error) VALUES ${placeholders.join(', ')}`,
        ...values,
      );
      done += batch.length;
      if (logId) {
        await this.reportProgress(logId, done, totalSteps, 10, 80, `Articoli (${Math.min(start + BATCH_SIZE, parsed.articoli.length)}/${parsed.articoli.length})`);
      }
    }

    // Swap atomico in un blocco DO (singola istruzione, compatibile con
    // prepared statement di Prisma). L'intero blocco è una transazione.
    if (logId) await this.setProgress(logId, 82, 'Swap tabelle…');
    await this.prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        -- swap famiglie
        DROP TABLE IF EXISTS integra_famiglie_old CASCADE;
        ALTER TABLE IF EXISTS integra_famiglie RENAME TO integra_famiglie_old;
        ALTER TABLE integra_famiglie_new RENAME TO integra_famiglie;
        DROP TABLE IF EXISTS integra_famiglie_old CASCADE;
        -- swap linee
        DROP TABLE IF EXISTS integra_linee_old CASCADE;
        ALTER TABLE IF EXISTS integra_linee RENAME TO integra_linee_old;
        ALTER TABLE integra_linee_new RENAME TO integra_linee;
        DROP TABLE IF EXISTS integra_linee_old CASCADE;
        -- swap articoli
        DROP TABLE IF EXISTS integra_articoli_old CASCADE;
        ALTER TABLE IF EXISTS integra_articoli RENAME TO integra_articoli_old;
        ALTER TABLE integra_articoli_new RENAME TO integra_articoli;
        DROP TABLE IF EXISTS integra_articoli_old CASCADE;
      END $$;
    `);

    // Indici fuori dalla transazione per evitare lock lunghi
    if (logId) await this.setProgress(logId, 90, 'Creazione indici…');
    await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_articoli_descr ON integra_articoli USING gin (pro_descr gin_trgm_ops)`);
    await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_articoli_cod ON integra_articoli USING gin (pro_cod gin_trgm_ops)`);
    await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_articoli_famiglia ON integra_articoli(famiglia_codice)`);
    await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_articoli_linea ON integra_articoli(linea_codice)`);
    await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_articoli_errors ON integra_articoli(sync_status) WHERE sync_status != 'ok'`);

    if (logId) await this.setProgress(logId, 98, 'Finalizzazione…');
  }

  /** Calcola e aggiorna il progresso lineare tra startPct e endPct */
  private async reportProgress(logId: number, done: number, total: number, startPct: number, endPct: number, phase: string) {
    const pct = startPct + Math.round((done / total) * (endPct - startPct));
    await this.setProgress(logId, Math.min(pct, endPct), phase);
  }

  private async startLog(entity: string): Promise<number> {
    // Marca come stale tutte le running precedenti
    await this.prisma.$executeRawUnsafe(
      `UPDATE sync_log SET status = 'stale', error_text = 'Sostituita da nuova sync' WHERE status = 'running'`,
    );
    const [row] = await this.prisma.$queryRawUnsafe<{ id: number }[]>(
      `INSERT INTO sync_log (entity) VALUES ($1) RETURNING id`,
      entity,
    );
    return row.id;
  }

  private async completeLog(id: number, status: string, total: number, ok: number, err: number) {
    await this.prisma.$executeRawUnsafe(
      `UPDATE sync_log SET status = $1, rows_total = $2, rows_ok = $3, rows_error = $4, completed_at = now() WHERE id = $5`,
      status, total, ok, err, id,
    );
  }

  private async failLog(id: number, errorText: string) {
    await this.prisma.$executeRawUnsafe(
      `UPDATE sync_log SET status = 'failed', error_text = $1, completed_at = now() WHERE id = $2`,
      errorText, id,
    );
  }
}
