import { Injectable, Logger } from '@nestjs/common';
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
  private readonly FDW_VIEW = 'b2b_prodotti';

  constructor(private readonly prisma: PrismaService) {}

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
    const famiglie = new Map<string, { nome: string; proCod: string }>();
    const linee = new Map<string, { nome: string; famigliaCodice: string | null; proCod: string }>();
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
          famiglie.set(codFamiglia, { nome: proDescr, proCod });
        }
      } else if (proCod.toLowerCase().startsWith('linea_')) {
        // Linea: la chiave è cod_linea (numerico), non pro_cod
        if (codLinea) {
          linee.set(codLinea, { nome: proDescr, famigliaCodice: codFamiglia || null, proCod });
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

    // Se mancano righe FAM_%/Linea_%, estrai i codici distinti dagli articoli
    // in modo che integra_famiglie/linee non restino vuote.
    for (const a of articoli) {
      const cf = a.famiglia_codice as string | null;
      if (cf && !famiglie.has(cf)) {
        famiglie.set(cf, { nome: 'Famiglia ' + cf, proCod: `FAM_${cf}` });
      }
      const cl = a.linea_codice as string | null;
      if (cl && !linee.has(cl)) {
        linee.set(cl, { nome: 'Linea ' + cl, famigliaCodice: null, proCod: `LIN_${cl}` });
      }
    }

    return {
      famiglie: [...famiglie.entries()].map(([codice, v]) => ({
        codice: v.proCod,
        codice_numerico: codice,
        nome: v.nome,
      })),
      linee: [...linee.entries()].map(([codice, l]) => ({
        codice: l.proCod,
        codice_numerico: codice,
        nome: l.nome,
        famiglia_codice: l.famigliaCodice,
      })),
      articoli,
    };
  }

  private async atomicReplace(parsed: {
    famiglie: { codice: string; codice_numerico: string; nome: string }[];
    linee: { codice: string; codice_numerico: string; nome: string; famiglia_codice: string | null }[];
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
    await this.prisma.$executeRawUnsafe(`CREATE TABLE integra_famiglie_new (codice TEXT PRIMARY KEY, codice_numerico TEXT, nome TEXT NOT NULL DEFAULT '', sync_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS integra_linee_new CASCADE`);
    await this.prisma.$executeRawUnsafe(`CREATE TABLE integra_linee_new (codice TEXT PRIMARY KEY, codice_numerico TEXT, nome TEXT NOT NULL DEFAULT '', famiglia_codice TEXT, sync_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS integra_articoli_new CASCADE`);
    await this.prisma.$executeRawUnsafe(`CREATE TABLE integra_articoli_new (LIKE integra_articoli INCLUDING DEFAULTS)`);
    if (logId) await this.setProgress(logId, 10, 'Tabelle preparate, inserimento dati…');

    // Popola famiglie (batch singolo, sono poche)
    for (const f of parsed.famiglie) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO integra_famiglie_new (codice, codice_numerico, nome) VALUES ($1, $2, $3)`,
        f.codice, f.codice_numerico, f.nome,
      );
      done++;
    }
    if (logId) await this.reportProgress(logId, done, totalSteps, 10, 80, 'Famiglie');

    // Popola linee (batch singolo)
    for (const l of parsed.linee) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO integra_linee_new (codice, codice_numerico, nome, famiglia_codice) VALUES ($1, $2, $3, $4)`,
        l.codice, l.codice_numerico, l.nome, l.famiglia_codice,
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

  // ── Sync clienti, indirizzi, pagamenti ──

  async syncClienti(): Promise<SyncResult> {
    const startedAt = new Date();
    let logId: number | null = null;
    try {
      logId = await this.startLog('clienti');
      await this.setProgress(logId, 0, 'Avvio sincronizzazione clienti…');

      const [clientiRows, indirizziRows, pagamentiRows] = await Promise.all([
        this.withTimeout(this.prisma.$queryRawUnsafe<Record<string, unknown>[]>('SELECT * FROM b2b_clienti'), 120_000, 'b2b_clienti'),
        this.withTimeout(this.prisma.$queryRawUnsafe<Record<string, unknown>[]>('SELECT * FROM b2b_indirizzi_clienti'), 120_000, 'b2b_indirizzi_clienti'),
        this.withTimeout(this.prisma.$queryRawUnsafe<Record<string, unknown>[]>('SELECT * FROM b2b_pagamenti_clienti'), 120_000, 'b2b_pagamenti_clienti'),
      ]);
      await this.setProgress(logId, 5, `Letti ${clientiRows.length} clienti, ${indirizziRows.length} indirizzi, ${pagamentiRows.length} pagamenti`);

      const totalSteps = clientiRows.length + indirizziRows.length + pagamentiRows.length || 1;
      let done = 0;

      // Crea tabelle _new
      await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS integra_clienti_new CASCADE`);
      await this.prisma.$executeRawUnsafe(`CREATE TABLE integra_clienti_new (id_cliente INTEGER, codice_cliente TEXT, ragione_sociale TEXT, email TEXT, telefono TEXT, web TEXT, partita_iva TEXT, codice_fiscale TEXT, indirizzo TEXT, cap TEXT, citta TEXT, provincia TEXT, codice_listino TEXT, codice_pagamento TEXT, fido_totale DECIMAL, cli_obsoleto SMALLINT, data_modifica TIMESTAMPTZ)`);

      await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS integra_indirizzi_new CASCADE`);
      await this.prisma.$executeRawUnsafe(`CREATE TABLE integra_indirizzi_new (id_destinazione INTEGER, id_cliente INTEGER, codice_cliente TEXT, ragione_sociale TEXT, indirizzo TEXT, cap TEXT, citta TEXT, provincia TEXT, flag_spedizione BOOLEAN)`);

      await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS integra_pagamenti_new CASCADE`);
      await this.prisma.$executeRawUnsafe(`CREATE TABLE integra_pagamenti_new (id_cliente INTEGER, codice_cliente TEXT, codice_pagamento TEXT, fido_totale DECIMAL, fido_concessione DECIMAL, obsoleto SMALLINT)`);
      await this.setProgress(logId, 12, 'Tabelle preparate, inserimento dati…');

      const BATCH = 200;

      for (let i = 0; i < clientiRows.length; i += BATCH) {
        const batch = clientiRows.slice(i, i + BATCH);
        const phs: string[] = [];
        const vals: unknown[] = [];
        for (const r of batch) {
          const idx = vals.length;
          phs.push(`($${idx + 1},$${idx + 2},$${idx + 3},$${idx + 4},$${idx + 5},$${idx + 6},$${idx + 7},$${idx + 8},$${idx + 9},$${idx + 10},$${idx + 11},$${idx + 12},$${idx + 13},$${idx + 14},$${idx + 15},$${idx + 16},$${idx + 17})`);
          vals.push(
            r.id_cliente, r.codice_cliente, r.ragione_sociale, r.email, r.telefono, r.web,
            r.partita_iva, r.codice_fiscale, r.indirizzo, r.cap, r.citta, r.provincia,
            r.codice_listino, r.codice_pagamento, r.fido_totale, r.cli_obsoleto, r.data_modifica,
          );
        }
        if (phs.length) {
          await this.prisma.$executeRawUnsafe(
            `INSERT INTO integra_clienti_new VALUES ${phs.join(', ')}`, ...vals,
          );
          done += batch.length;
          await this.reportProgress(logId, done, totalSteps, 12, 90, `Clienti (${Math.min(i + BATCH, clientiRows.length)}/${clientiRows.length})`);
        }
      }

      for (let i = 0; i < indirizziRows.length; i += BATCH) {
        const batch = indirizziRows.slice(i, i + BATCH);
        const phs: string[] = [];
        const vals: unknown[] = [];
        for (const r of batch) {
          const idx = vals.length;
          phs.push(`($${idx + 1},$${idx + 2},$${idx + 3},$${idx + 4},$${idx + 5},$${idx + 6},$${idx + 7},$${idx + 8},$${idx + 9})`);
          vals.push(
            r.id_destinazione, r.id_cliente, r.codice_cliente, r.ragione_sociale,
            r.indirizzo, r.cap, r.citta, r.provincia,
            r.flag_spedizione === true || r.flag_spedizione === 'S' || r.flag_spedizione === '1',
          );
        }
        if (phs.length) {
          await this.prisma.$executeRawUnsafe(
            `INSERT INTO integra_indirizzi_new VALUES ${phs.join(', ')}`, ...vals,
          );
          done += batch.length;
          await this.reportProgress(logId, done, totalSteps, 12, 90, `Indirizzi (${Math.min(i + BATCH, indirizziRows.length)}/${indirizziRows.length})`);
        }
      }

      for (let i = 0; i < pagamentiRows.length; i += BATCH) {
        const batch = pagamentiRows.slice(i, i + BATCH);
        const phs: string[] = [];
        const vals: unknown[] = [];
        for (const r of batch) {
          const idx = vals.length;
          phs.push(`($${idx + 1},$${idx + 2},$${idx + 3},$${idx + 4},$${idx + 5},$${idx + 6})`);
          vals.push(
            r.id_cliente, r.codice_cliente, r.codice_pagamento,
            r.fido_totale, r.fido_concessione, r.obsoleto,
          );
        }
        if (phs.length) {
          await this.prisma.$executeRawUnsafe(
            `INSERT INTO integra_pagamenti_new VALUES ${phs.join(', ')}`, ...vals,
          );
          done += batch.length;
          await this.reportProgress(logId, done, totalSteps, 12, 90, `Pagamenti (${Math.min(i + BATCH, pagamentiRows.length)}/${pagamentiRows.length})`);
        }
      }

      // Swap atomico
      await this.prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          DROP TABLE IF EXISTS integra_clienti_old CASCADE;
          ALTER TABLE IF EXISTS integra_clienti RENAME TO integra_clienti_old;
          ALTER TABLE integra_clienti_new RENAME TO integra_clienti;
          DROP TABLE IF EXISTS integra_clienti_old CASCADE;
          DROP TABLE IF EXISTS integra_indirizzi_old CASCADE;
          ALTER TABLE IF EXISTS integra_indirizzi RENAME TO integra_indirizzi_old;
          ALTER TABLE integra_indirizzi_new RENAME TO integra_indirizzi;
          DROP TABLE IF EXISTS integra_indirizzi_old CASCADE;
          DROP TABLE IF EXISTS integra_pagamenti_old CASCADE;
          ALTER TABLE IF EXISTS integra_pagamenti RENAME TO integra_pagamenti_old;
          ALTER TABLE integra_pagamenti_new RENAME TO integra_pagamenti;
          DROP TABLE IF EXISTS integra_pagamenti_old CASCADE;
        END $$;
      `);
      await this.setProgress(logId, 92, 'Swap tabelle…');

      const durationMs = Date.now() - startedAt.getTime();
      const totalRows = clientiRows.length + indirizziRows.length + pagamentiRows.length;
      await this.setProgress(logId, 100, 'Completato');
      await this.completeLog(logId, 'ok', totalRows, totalRows, 0);
      this.logger.log(`Sync clienti completato: ${clientiRows.length} clienti, ${indirizziRows.length} indirizzi, ${pagamentiRows.length} pagamenti`);

      return { entity: 'clienti', status: 'ok', rowsTotal: totalRows, rowsOk: totalRows, rowsError: 0, durationMs, progressPct: 100, progressPhase: 'Completato' };
    } catch (err) {
      const durationMs = Date.now() - startedAt.getTime();
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Sync clienti fallito: ${msg}`);
      if (logId) await this.failLog(logId, msg);
      return { entity: 'clienti', status: 'failed', rowsTotal: 0, rowsOk: 0, rowsError: 0, errorText: msg, durationMs, progressPct: 0, progressPhase: `Errore: ${msg}` };
    }
  }

  // ── Sync ordini ──

  async syncOrdini(): Promise<SyncResult> {
    const startedAt = new Date();
    let logId: number | null = null;
    try {
      logId = await this.startLog('ordini');
      await this.setProgress(logId, 0, 'Avvio sincronizzazione ordini…');

      const [ordiniRows, righeRows] = await Promise.all([
        this.withTimeout(this.prisma.$queryRawUnsafe<Record<string, unknown>[]>('SELECT * FROM b2b_ordini_clienti'), 180_000, 'b2b_ordini_clienti'),
        this.withTimeout(this.prisma.$queryRawUnsafe<Record<string, unknown>[]>('SELECT * FROM b2b_righe_ordini'), 180_000, 'b2b_righe_ordini'),
      ]);
      await this.setProgress(logId, 5, `Letti ${ordiniRows.length} ordini, ${righeRows.length} righe`);

      const totalSteps = ordiniRows.length + righeRows.length || 1;
      let done = 0;

      await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS integra_ordini_new CASCADE`);
      await this.prisma.$executeRawUnsafe(`CREATE TABLE integra_ordini_new (id_ordine INTEGER, numero_ordine TEXT, anno_ordine SMALLINT, data_ordine DATE, id_cliente INTEGER, codice_cliente TEXT, importo_imponibile DECIMAL, flag_obsoleto SMALLINT, data_modifica TIMESTAMPTZ)`);

      await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS integra_righe_ordini_new CASCADE`);
      await this.prisma.$executeRawUnsafe(`CREATE TABLE integra_righe_ordini_new (id_ordine INTEGER, id_riga INTEGER, codice_prodotto TEXT, descrizione_riga TEXT, quantita DECIMAL, prezzo_netto DECIMAL)`);
      await this.setProgress(logId, 12, 'Tabelle preparate, inserimento dati…');

      const BATCH = 200;

      for (let i = 0; i < ordiniRows.length; i += BATCH) {
        const batch = ordiniRows.slice(i, i + BATCH);
        const phs: string[] = [];
        const vals: unknown[] = [];
        for (const r of batch) {
          const idx = vals.length;
          phs.push(`($${idx + 1},$${idx + 2},$${idx + 3},$${idx + 4},$${idx + 5},$${idx + 6},$${idx + 7},$${idx + 8},$${idx + 9})`);
          vals.push(r.id_ordine, r.numero_ordine, r.anno_ordine, r.data_ordine, r.id_cliente, r.codice_cliente, r.importo_imponibile, r.flag_obsoleto, r.data_modifica);
        }
        if (phs.length) {
          await this.prisma.$executeRawUnsafe(
            `INSERT INTO integra_ordini_new VALUES ${phs.join(', ')}`, ...vals,
          );
          done += batch.length;
          await this.reportProgress(logId, done, totalSteps, 12, 90, `Ordini (${Math.min(i + BATCH, ordiniRows.length)}/${ordiniRows.length})`);
        }
      }

      for (let i = 0; i < righeRows.length; i += BATCH) {
        const batch = righeRows.slice(i, i + BATCH);
        const phs: string[] = [];
        const vals: unknown[] = [];
        for (const r of batch) {
          const idx = vals.length;
          phs.push(`($${idx + 1},$${idx + 2},$${idx + 3},$${idx + 4},$${idx + 5},$${idx + 6})`);
          vals.push(r.id_ordine, r.id_riga, r.codice_prodotto, r.descrizione_riga, r.quantita, r.prezzo_netto);
        }
        if (phs.length) {
          await this.prisma.$executeRawUnsafe(
            `INSERT INTO integra_righe_ordini_new VALUES ${phs.join(', ')}`, ...vals,
          );
          done += batch.length;
          await this.reportProgress(logId, done, totalSteps, 12, 90, `Righe (${Math.min(i + BATCH, righeRows.length)}/${righeRows.length})`);
        }
      }

      await this.prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          DROP TABLE IF EXISTS integra_ordini_old CASCADE;
          ALTER TABLE IF EXISTS integra_ordini RENAME TO integra_ordini_old;
          ALTER TABLE integra_ordini_new RENAME TO integra_ordini;
          DROP TABLE IF EXISTS integra_ordini_old CASCADE;
          DROP TABLE IF EXISTS integra_righe_ordini_old CASCADE;
          ALTER TABLE IF EXISTS integra_righe_ordini RENAME TO integra_righe_ordini_old;
          ALTER TABLE integra_righe_ordini_new RENAME TO integra_righe_ordini;
          DROP TABLE IF EXISTS integra_righe_ordini_old CASCADE;
        END $$;
      `);
      await this.setProgress(logId, 92, 'Swap tabelle…');

      const durationMs = Date.now() - startedAt.getTime();
      const totalRows = ordiniRows.length + righeRows.length;
      await this.setProgress(logId, 100, 'Completato');
      await this.completeLog(logId, 'ok', totalRows, totalRows, 0);
      this.logger.log(`Sync ordini completato: ${ordiniRows.length} ordini, ${righeRows.length} righe`);

      return { entity: 'ordini', status: 'ok', rowsTotal: totalRows, rowsOk: totalRows, rowsError: 0, durationMs, progressPct: 100, progressPhase: 'Completato' };
    } catch (err) {
      const durationMs = Date.now() - startedAt.getTime();
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Sync ordini fallito: ${msg}`);
      if (logId) await this.failLog(logId, msg);
      return { entity: 'ordini', status: 'failed', rowsTotal: 0, rowsOk: 0, rowsError: 0, errorText: msg, durationMs, progressPct: 0, progressPhase: `Errore: ${msg}` };
    }
  }

  // ── Sync listini (full-replace per listino attivo) ──

  async syncListiniCron() {
    this.logger.log('Sync automatico listini avviato');
    await this.syncListini();
  }

  async syncGiacenzaCron() {
    this.logger.log('Sync automatico giacenze avviato');
    await this.syncGiacenza();
  }

  async syncListini(): Promise<SyncResult> {
    const startedAt = new Date();
    let logId: number | null = null;
    try {
      logId = await this.startLog('listini');
      await this.setProgress(logId, 0, 'Avvio sincronizzazione listini…');

      // Listini da mantenere: quelli già presenti in cache + il default LIS1
      const attivi = await this.prisma.$queryRawUnsafe<{ c: string }[]>(
        `SELECT DISTINCT codice_listino AS c FROM integra_listini UNION SELECT 'LIS1'`,
      );
      const codici = attivi.map(r => r.c).filter(Boolean);
      if (codici.length === 0) {
        codici.push('LIS1');
      }

      await this.setProgress(logId, 5, `Listini da aggiornare: ${codici.length}`);

      for (let idx = 0; idx < codici.length; idx++) {
        const codice = codici[idx];

        // Upsert testata
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO integra_listini (codice_listino, descrizione_listino, listino_obsoleto, data_modifica)
           SELECT codice_listino, descrizione_listino, listino_obsoleto, data_modifica
           FROM b2b_listini_testata WHERE codice_listino = $1 AND (listino_obsoleto IS NULL OR listino_obsoleto = 0)
           ON CONFLICT (codice_listino) DO UPDATE SET
             descrizione_listino = EXCLUDED.descrizione_listino,
             listino_obsoleto = EXCLUDED.listino_obsoleto,
             data_modifica = EXCLUDED.data_modifica`,
          codice,
        );

        // Full-replace righe (gestisce inserimenti, modifiche e cancellazioni fisiche)
        await this.prisma.$executeRawUnsafe(
          `DELETE FROM integra_listini_righe WHERE codice_listino = $1`,
          codice,
        );
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO integra_listini_righe (id_riga_listino, codice_listino, codice_prodotto, id_variante, prezzo_listino, sconto_1, sconto_2, sconto_3, sconto_4, listino_obsoleto, data_modifica)
           SELECT id_riga_listino, codice_listino, codice_prodotto, id_variante, prezzo_listino, sconto_1, sconto_2, sconto_3, sconto_4, 0, data_modifica
           FROM b2b_listini_righe WHERE codice_listino = $1 AND (listino_obsoleto IS NULL OR listino_obsoleto = 0)`,
          codice,
        );

        const pct = 10 + Math.round((80 * (idx + 1)) / codici.length);
        await this.setProgress(logId, pct, `Listino ${codice} (${idx + 1}/${codici.length})`);
      }

      // Aggiorna sync_state
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO sync_state (entity, last_cursor, last_run_at, status)
         VALUES ('listini', now(), now(), 'ok')
         ON CONFLICT (entity) DO UPDATE SET last_cursor = now(), last_run_at = now(), status = 'ok'`,
      );

      const durationMs = Date.now() - startedAt.getTime();
      await this.setProgress(logId, 100, 'Completato');
      await this.completeLog(logId, 'ok', codici.length, codici.length, 0);
      this.logger.log(`Sync listini completato: ${codici.length} listini sincronizzati`);

      return { entity: 'listini', status: 'ok', rowsTotal: codici.length, rowsOk: codici.length, rowsError: 0, durationMs, progressPct: 100, progressPhase: 'Completato' };
    } catch (err) {
      const durationMs = Date.now() - startedAt.getTime();
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Sync listini fallito: ${msg}`);
      if (logId) await this.failLog(logId, msg);
      return { entity: 'listini', status: 'failed', rowsTotal: 0, rowsOk: 0, rowsError: 0, errorText: msg, durationMs, progressPct: 0, progressPhase: `Errore: ${msg}` };
    }
  }

  /**
   * Sincronizza le tabelle di lookup portale da Integra (viste b2b_*):
   * pagamenti, porti, spedizioni, vettori. Full-replace idempotente.
   */
  async syncLookup(): Promise<SyncResult> {
    const startedAt = new Date();
    let logId: number | null = null;
    try {
      logId = await this.startLog('lookup');
      const maps = [
        {
          dst: 'integra_pagamenti_descr', src: 'b2b_tabpag',
          cols: 'codice_pagamento, descrizione_pagamento, obsoleto, aggiornato_il',
          sel: 'codice_pagamento, descrizione_pagamento, COALESCE(obsoleto, 0)::bool, now()',
        },
        {
          dst: 'integra_porti', src: 'b2b_tabpor',
          cols: 'codice_porto, descrizione_porto, obsoleto, aggiornato_il',
          sel: 'codice_porto, descrizione_porto, COALESCE(obsoleto, 0)::bool, now()',
        },
        {
          dst: 'integra_spedizioni', src: 'b2b_tabspe',
          cols: 'codice_spedizione, descrizione_spedizione, obsoleto, aggiornato_il',
          sel: 'codice_spedizione, descrizione_spedizione, COALESCE(obsoleto, 0)::bool, now()',
        },
        {
          dst: 'integra_vettori', src: 'b2b_vettori',
          // b2b_vettori non ha descrizione: uso il codice come descrizione
          cols: 'codice_vettore, descrizione, obsoleto, aggiornato_il',
          sel: "codice_vettore, codice_vettore, COALESCE(obsoleto, 0)::bool, now()",
        },
      ];
      let total = 0;
      for (const m of maps) {
        const cnt = await this.prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT count(*)::int n FROM ${m.src}`);
        if (!cnt[0]?.n) {
          this.logger.warn(`Lookup sorgente ${m.src} vuota: skip (non cancello ${m.dst})`);
          continue;
        }
        await this.prisma.$executeRawUnsafe(`DELETE FROM ${m.dst}`);
        await this.prisma.$executeRawUnsafe(`INSERT INTO ${m.dst} (${m.cols}) SELECT ${m.sel} FROM ${m.src}`);
        const after = await this.prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT count(*)::int n FROM ${m.dst}`);
        const n = after[0]?.n ?? 0;
        total += n;
        this.logger.log(`Lookup ${m.dst}: ${n} righe`);
        await this.setProgress(logId, 0, `Lookup ${m.dst}: ${n} righe`);
      }
      const durationMs = Date.now() - startedAt.getTime();
      await this.completeLog(logId, 'ok', total, total, 0);
      this.logger.log(`Sync lookup completato: ${total} righe totali`);
      return { entity: 'lookup', status: 'ok', rowsTotal: total, rowsOk: total, rowsError: 0, durationMs, progressPct: 100, progressPhase: 'Completato' };
    } catch (err) {
      const durationMs = Date.now() - startedAt.getTime();
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Sync lookup fallito: ${msg}`);
      if (logId) await this.failLog(logId, msg);
      return { entity: 'lookup', status: 'failed', rowsTotal: 0, rowsOk: 0, rowsError: 0, errorText: msg, durationMs, progressPct: 0, progressPhase: `Errore: ${msg}` };
    }
  }

  /**
   * Sincronizzazione RAPIDA delle giacenze.
   * Legge la vista locale `b2b_giacenze` (codice_prodotto + giacenza, ~21k righe)
   * e aggiorna SOLO le varianti portale il cui valore è cambiato, con un singolo
   * UPDATE ... FROM. Non ritocca il catalogo completo: pensato per girare spesso.
   */
  async syncGiacenza(): Promise<SyncResult> {
    const startedAt = new Date();
    let logId: number | null = null;
    try {
      logId = await this.startLog('giacenza');
      await this.setProgress(logId, 0, 'Avvio sincronizzazione giacenze…');

      const exists = await this.prisma.$queryRawUnsafe<{ n: number }[]>(
        `SELECT count(*)::int n FROM information_schema.tables WHERE table_name = 'b2b_giacenze'`,
      );
      if (!exists[0]?.n) {
        throw new Error('Vista b2b_giacenze non presente nel database locale.');
      }

      const [totRow] = await this.prisma.$queryRawUnsafe<{ n: number }[]>(
        `SELECT count(*)::int n FROM b2b_giacenze`,
      );
      const total = totRow?.n ?? 0;
      await this.setProgress(logId, 10, `Vista giacenze: ${total} righe`);

      const [matchedRow] = await this.prisma.$queryRawUnsafe<{ n: number }[]>(
        `SELECT count(*)::int n FROM varianti v JOIN b2b_giacenze g ON g.codice_prodotto = v.codice`,
      );
      const matched = matchedRow?.n ?? 0;
      await this.setProgress(logId, 40, `${matched} varianti collegate alla vista`);

      // Diff veloce lato DB: aggiorna solo le righe il cui valore è cambiato
      const updated = await this.prisma.$executeRawUnsafe(`
        UPDATE varianti v
        SET giacenza = ROUND(g.giacenza)::int
        FROM b2b_giacenze g
        WHERE g.codice_prodotto = v.codice
          AND v.giacenza IS DISTINCT FROM ROUND(g.giacenza)::int
      `);
      const updatedCount = typeof updated === 'number' ? updated : 0;

      await this.setProgress(logId, 100, 'Completato');
      const durationMs = Date.now() - startedAt.getTime();
      await this.completeLog(logId, 'ok', total, updatedCount, 0);
      this.logger.log(
        `Sync giacenze: ${total} righe vista, ${matched} varianti collegate, ${updatedCount} aggiornate (${durationMs}ms)`,
      );

      return {
        entity: 'giacenza',
        status: 'ok',
        rowsTotal: total,
        rowsOk: updatedCount,
        rowsError: 0,
        durationMs,
        progressPct: 100,
        progressPhase: `Completato: ${updatedCount} aggiornate su ${matched} collegate`,
      };
    } catch (err) {
      const durationMs = Date.now() - startedAt.getTime();
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Sync giacenze fallito: ${msg}`);
      if (logId) await this.failLog(logId, msg);
      return { entity: 'giacenza', status: 'failed', rowsTotal: 0, rowsOk: 0, rowsError: 0, errorText: msg, durationMs, progressPct: 0, progressPhase: `Errore: ${msg}` };
    }
  }
}
