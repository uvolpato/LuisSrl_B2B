import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrazioneService } from '../integrazione/integrazione.service';
import { EmbeddingService } from '../integrazione/embedding.service';
import { InsightService } from '../insight/insight.service';

/**
 * Motore dei box di suggerimento della dashboard cliente.
 *
 * Fase 1 (deterministico, senza LLM):
 *  1. vincoli duri in SQL (soloInOfferta, escludiAcquistati, giacenza>0, scope)
 *  2. intento semantico dal prompt → coseno su articolo_embedding (filtro soft)
 *  3. score pesato per box: acquisti·w1 + tracking·w2 + progetti·w3 + affinità·w4
 *  4. top N + arricchimento (prezzo/disponibilità/promo)
 *
 * Fase 2 (cache + batch):
 *  - i box generati on-demand vengono salvati in dashboard_boxes (upsert per
 *    customerId+boxId) e riletti finché freschi (TTL configurabile);
 *  - batch notturno @Cron che rigenera i box dei clienti ATTIVI;
 *  - i box vuoti NON vengono cachati (non devono apparire);
 *  - i box non più attivi vengono rimossi dalla cache.
 *
 * Regole non negoziabili (DASHBOARD-SUGGERIMENTI-AI.md §4):
 *  - il modello non decide mai esclusioni/conteggi: sono SQL;
 *  - la dashboard non si rompe mai: fallback deterministico su best-seller;
 *  - un box senza candidati semplicemente non appare.
 */

interface PesiSegnali {
  acquisti: number;
  tracking: number;
  progetti: number;
  affinita: number;
}

const DEFAULT_PESI: PesiSegnali = { acquisti: 0.4, tracking: 0.25, progetti: 0.2, affinita: 0.15 };

interface Candidato {
  id: number;
  codiceLinea: string;
  famigliaCodice: string;
}

interface Segnali {
  acquisti: Map<string, number>;
  tracking: { famiglie: Map<string, number>; articoli: Map<string, number> };
  progetti: Map<string, number>;
  affinita: Map<string, number>;
}

@Injectable()
export class DashboardService {
  private readonly log = new Logger(DashboardService.name);
  private batchRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrazione: IntegrazioneService,
    private readonly embedding: EmbeddingService,
    private readonly insight: InsightService,
  ) {}

  /** Freschezza della cache in minuti (default 60). */
  private ttlMinutes(): number {
    const v = parseInt(process.env.DASHBOARD_CACHE_TTL_MINUTES || '60', 10);
    return Number.isFinite(v) && v > 0 ? v : 60;
  }

  /** Box attivi per un cliente: cache se fresca, altrimenti rigenera on-demand e aggiorna. */
  async getSuggerimenti(customerId: number, codiceListino?: string | null) {
    const boxes = await this.prisma.suggestionBox.findMany({
      where: { attiva: true },
      orderBy: [{ ordinamento: 'asc' }, { id: 'asc' }],
    });
    const cached = await this.prisma.dashboardBox.findMany({ where: { customerId } });

    // Box non più attivi (o cambiati) → rimuovi dalla cache.
    const attivi = new Set(boxes.map((b) => b.id));
    const orfane = cached.filter((c) => !attivi.has(c.boxId));
    if (orfane.length) {
      await this.prisma.dashboardBox.deleteMany({
        where: { customerId, boxId: { in: orfane.map((o) => o.boxId) } },
      });
    }

    const cutoff = new Date(Date.now() - this.ttlMinutes() * 60_000);
    const result: { boxId: number; titolo: string; rationale: string | null; articoli: unknown[] }[] = [];
    for (const box of boxes) {
      const row = cached.find((c) => c.boxId === box.id);
      if (row && row.generatoIl >= cutoff) {
        result.push({ boxId: box.id, titolo: row.titolo, rationale: row.rationale, articoli: row.prodotti as unknown[] });
        continue;
      }
      try {
        const articoli = await this.generaBox(box, customerId, codiceListino);
        if (articoli.length) {
          const rationale = await this.generaRationale(box, articoli);
          await this.upsertCache(customerId, box, articoli, rationale);
          result.push({ boxId: box.id, titolo: box.titolo, rationale, articoli });
        }
      } catch (e) {
        // Un box rotto non deve mai far cadere la dashboard.
        this.log.warn(`box #${box.id} "${box.titolo}" fallito: ${(e as Error).message}`);
      }
    }
    return { boxes: result };
  }

  /** Rigenerazione forzata di tutti i box di un cliente (ignora la cache). */
  async rigeneraCliente(customerId: number, codiceListino?: string | null) {
    const boxes = await this.prisma.suggestionBox.findMany({
      where: { attiva: true },
      orderBy: [{ ordinamento: 'asc' }, { id: 'asc' }],
    });
    await this.prisma.dashboardBox.deleteMany({ where: { customerId } });
    const result: { boxId: number; titolo: string; rationale: string | null; articoli: unknown[] }[] = [];
    for (const box of boxes) {
      try {
        const articoli = await this.generaBox(box, customerId, codiceListino);
        if (articoli.length) {
          const rationale = await this.generaRationale(box, articoli);
          await this.upsertCache(customerId, box, articoli, rationale);
          result.push({ boxId: box.id, titolo: box.titolo, rationale, articoli });
        }
      } catch (e) {
        this.log.warn(`box #${box.id} "${box.titolo}" fallito: ${(e as Error).message}`);
      }
    }
    return { boxes: result };
  }

  /** Batch notturno: rigenera i box di tutti i clienti ATTIVI. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async rigeneraTutti() {
    if (this.batchRunning) {
      this.log.warn('Batch dashboard_boxes già in esecuzione, salto il run');
      return;
    }
    this.batchRunning = true;
    const logId = await this.startBatchLog();
    try {
      const customers = await this.prisma.customer.findMany({
        where: { stato: 'ATTIVO' },
        select: { id: true, codiceListino: true },
      });
      const fallback = (await this.integrazione.getFirstListino())?.codice_listino ?? 'LIS1';
      let ok = 0;
      let errori = 0;
      for (const c of customers) {
        try {
          await this.rigeneraCliente(c.id, c.codiceListino ?? fallback);
          ok++;
        } catch (e) {
          errori++;
          this.log.warn(`Rigenerazione cliente #${c.id} fallita: ${(e as Error).message}`);
        }
      }
      this.log.log(`Batch dashboard_boxes: ${ok} ok, ${errori} errori su ${customers.length} clienti`);
      await this.completeBatchLog(logId, customers.length, ok, errori);
    } catch (e) {
      await this.failBatchLog(logId, (e as Error).message);
      throw e;
    } finally {
      this.batchRunning = false;
    }
  }

  private async upsertCache(
    customerId: number,
    box: Prisma.SuggestionBoxGetPayload<Record<string, never>>,
    articoli: Prisma.InputJsonValue,
    rationale: string | null,
  ) {
    await this.prisma.dashboardBox.upsert({
      where: { customerId_boxId: { customerId, boxId: box.id } },
      create: { customerId, boxId: box.id, titolo: box.titolo, rationale, prodotti: articoli },
      update: { titolo: box.titolo, rationale, prodotti: articoli, generatoIl: new Date() },
    });
  }

  /**
   * Frase di contesto del box (Fase 2, LLM). Deterministica nella selezione:
   * l'AI spiega soltanto, non sceglie né conta. Errori → null (il box resta).
   * Disattivabile con DASHBOARD_RATIONALE=off (batch notturno = 1 chiamata/box/cliente).
   */
  private async generaRationale(
    box: Prisma.SuggestionBoxGetPayload<Record<string, never>>,
    articoli: unknown[],
  ): Promise<string | null> {
    if (process.env.DASHBOARD_RATIONALE === 'off') return null;
    const nomi = (articoli as { nome?: string }[])
      .map((a) => a.nome)
      .filter(Boolean)
      .slice(0, 6)
      .join(', ');
    if (!nomi) return null;
    try {
      const prompt =
        `Sei l'assistente di un e-commerce B2B di vasi e complementi da giardino.\n` +
        `Box "${box.titolo}" (obiettivo: ${box.prompt || box.titolo}).\n` +
        `Prodotti proposti al cliente: ${nomi}.\n` +
        `Scrivi UNA sola frase in italiano (max 20 parole) che spieghi al cliente ` +
        `perché questi prodotti gli interessano. Nessun elenco, nessun markdown, niente virgolette.`;
      const txt = await this.integrazione.generaSintesiAI(prompt);
      const clean = txt?.trim().replace(/^["'\s]+|["'\s]+$/g, '').split('\n')[0];
      return clean || null;
    } catch (e) {
      this.log.warn(`rationale box #${box.id} fallita: ${(e as Error).message}`);
      return null;
    }
  }

  // ── Log del batch (tabella sync_log, entity='dashboard_boxes') ─────────────

  private async startBatchLog(): Promise<number> {
    const rows = await this.prisma.$queryRawUnsafe<{ id: number }[]>(
      `INSERT INTO sync_log (entity, status) VALUES ('dashboard_boxes', 'running') RETURNING id`,
    );
    return rows[0].id;
  }

  private async completeBatchLog(logId: number, totali: number, ok: number, errori: number) {
    await this.prisma.$executeRawUnsafe(
      `UPDATE sync_log SET status = 'ok', rows_total = $1, rows_ok = $2, rows_error = $3, completed_at = now() WHERE id = $4`,
      totali, ok, errori, logId,
    );
  }

  private async failBatchLog(logId: number, errore: string) {
    await this.prisma.$executeRawUnsafe(
      `UPDATE sync_log SET status = 'errore', error_text = $1, completed_at = now() WHERE id = $2`,
      errore, logId,
    );
  }

  /** Genera i candidati di un box per un cliente (engine deterministico). */
  async generaBox(
    box: Prisma.SuggestionBoxGetPayload<Record<string, never>>,
    customerId: number,
    codiceListino?: string | null,
  ) {
    const pesi = this.pesiNormalizzati(box.pesi);
    const [pool, segnali] = await Promise.all([
      this.poolVincoli(box, customerId),
      this.segnaliCliente(customerId),
    ]);
    if (!pool.length) return [];

    // Intento semantico del prompt: filtro soft dentro il pool (pgvector, coseno).
    // Se il prompt è generico i coseni sono piatti e il filtro non taglia nulla.
    let candidati = pool;
    const sem = await this.intentoSemantico(box.prompt, pool);
    if (sem) {
      const semSet = new Set(sem.keys());
      const inSem = pool.filter((c) => semSet.has(c.codiceLinea));
      // Se l'intento taglia ma restano meno di nArticoli, riempi dal resto del pool.
      if (inSem.length >= box.nArticoli) candidati = inSem;
      else if (inSem.length) candidati = [...inSem, ...pool.filter((c) => !semSet.has(c.codiceLinea))];
    }

    let ordinati = candidati
      .map((c) => ({ c, score: this.scoreCandidato(c, pesi, segnali) }))
      .sort((a, b) => b.score - a.score);

    // Cliente senza storia (nessun segnale): ordina per famiglie più vendute.
    const maxScore = ordinati.reduce((m, x) => Math.max(m, x.score), 0);
    if (maxScore <= 0) {
      const best = await this.famiglieBestSeller();
      ordinati = candidati
        .map((c) => ({ c, score: best.get(c.famigliaCodice) ?? 0 }))
        .sort((a, b) => b.score - a.score);
    }

    const top = ordinati.slice(0, box.nArticoli).map((x) => x.c);
    return this.arricchisci(box, top, codiceListino);
  }

  // ── Vincoli (SQL) ──────────────────────────────────────────────────────────

  private async poolVincoli(
    box: Pick<Prisma.SuggestionBoxGetPayload<Record<string, never>>, 'soloInOfferta' | 'escludiAcquistati' | 'scopeFamiglia' | 'scopeRaccolta'>,
    customerId: number,
  ): Promise<Candidato[]> {
    const conds: string[] = [`a.configurato = true`, `a.stato = 'ATTIVO'`, `f.stato = 'ATTIVO'`];
    const params: unknown[] = [customerId];
    let idx = 2;

    if (box.scopeFamiglia?.trim()) {
      conds.push(`a.famiglia_codice = $${idx}`);
      params.push(box.scopeFamiglia.trim());
      idx++;
    }
    if (box.scopeRaccolta?.trim()) {
      conds.push(`EXISTS (
        SELECT 1 FROM articoli_raccolte ar JOIN raccolte r ON r.id = ar.raccolta_id
        WHERE ar.articolo_id = a.id AND r.slug = $${idx} AND r.stato = 'ATTIVO')`);
      params.push(box.scopeRaccolta.trim());
      idx++;
    }
    if (box.escludiAcquistati) {
      // codice_prodotto può essere codice variante oppure codice linea: copre entrambi.
      conds.push(`NOT EXISTS (
        SELECT 1 FROM righe_ordini ro JOIN ordini_clienti o ON o.id = ro.ordine_id
        JOIN varianti v ON v.codice = ro.codice_prodotto
        WHERE v.articolo_id = a.id AND o.customer_id = $1)`);
      conds.push(`NOT EXISTS (
        SELECT 1 FROM righe_ordini ro JOIN ordini_clienti o ON o.id = ro.ordine_id
        WHERE ro.codice_prodotto = a.codice_linea AND o.customer_id = $1)`);
    }
    // Giacenza: i box non propongono articoli esauriti (vincolo sempre attivo per ora).
    conds.push(`EXISTS (
      SELECT 1 FROM varianti v WHERE v.articolo_id = a.id AND v.stato <> 'NASCOSTO' AND v.giacenza > 0)`);
    if (box.soloInOfferta) {
      conds.push(`EXISTS (
        SELECT 1 FROM promozioni p
        WHERE p.attiva = true AND p.data_inizio <= now() AND p.data_fine >= now()
          AND (array_length(p.articoli, 1) IS NULL
               OR a.codice_linea = ANY(p.articoli)
               OR EXISTS (SELECT 1 FROM varianti v WHERE v.articolo_id = a.id AND v.codice = ANY(p.articoli)))
          AND (array_length(p.famiglie, 1) IS NULL OR a.famiglia_codice = ANY(p.famiglie)))`);
    }

    const rows = await this.prisma.$queryRawUnsafe<{ id: number; codice_linea: string; famiglia_codice: string }[]>(
      `SELECT a.id, a.codice_linea, a.famiglia_codice
         FROM articoli a JOIN famiglie f ON f.codice = a.famiglia_codice
        WHERE ${conds.join(' AND ')}`,
      ...params,
    );
    return rows.map((r) => ({ id: r.id, codiceLinea: r.codice_linea, famigliaCodice: r.famiglia_codice }));
  }

  // ── Segnali ────────────────────────────────────────────────────────────────

  private async segnaliCliente(customerId: number): Promise<Segnali> {
    const [acquisti, tracking, progetti, affinita] = await Promise.all([
      this.acquistiCliente(customerId),
      this.trackingCliente(customerId),
      this.progettiCliente(customerId),
      this.affinitaCliente(customerId),
    ]);
    return { acquisti, tracking, progetti, affinita };
  }

  /** Famiglie preferite dagli acquisti del cliente (peso = righe ordinate). */
  private async acquistiCliente(customerId: number): Promise<Map<string, number>> {
    const rows = await this.prisma.$queryRawUnsafe<{ fam: string; n: bigint }[]>(
      `SELECT x.fam, sum(x.n)::bigint AS n FROM (
         SELECT f.codice AS fam, count(*) AS n
           FROM righe_ordini ro JOIN ordini_clienti o ON o.id = ro.ordine_id
           JOIN varianti v ON v.codice = ro.codice_prodotto
           JOIN articoli a ON a.id = v.articolo_id
           JOIN famiglie f ON f.codice = a.famiglia_codice
          WHERE o.customer_id = $1 GROUP BY f.codice
         UNION ALL
         SELECT f.codice AS fam, count(*) AS n
           FROM righe_ordini ro JOIN ordini_clienti o ON o.id = ro.ordine_id
           JOIN articoli a ON a.codice_linea = ro.codice_prodotto
           JOIN famiglie f ON f.codice = a.famiglia_codice
          WHERE o.customer_id = $1 GROUP BY f.codice
       ) x GROUP BY x.fam`,
      customerId,
    );
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.fam, Number(r.n));
    return this.normalizza(map);
  }

  /** Interesse recente: visti, aggiunti al carrello, salvati. Per famiglia e per articolo. */
  private async trackingCliente(
    customerId: number,
    days = 120,
  ): Promise<{ famiglie: Map<string, number>; articoli: Map<string, number> }> {
    const rows = await this.prisma.$queryRawUnsafe<{ fam: string | null; cl: string | null; n: bigint }[]>(
      `SELECT x.fam, x.cl, count(*)::bigint AS n FROM (
         SELECT f.codice AS fam, a.codice_linea AS cl
           FROM customer_event ce
           JOIN articoli a ON a.codice_linea = ce.entita_id
           JOIN famiglie f ON f.codice = a.famiglia_codice
          WHERE ce.customer_id = $1 AND ce.tipo = 'articolo.view'
            AND ce.created_at >= now() - make_interval(days => $2::int)
         UNION ALL
         SELECT f.codice AS fam, a.codice_linea AS cl
           FROM customer_event ce
           JOIN varianti v ON v.codice = ce.entita_id
           JOIN articoli a ON a.id = v.articolo_id
           JOIN famiglie f ON f.codice = a.famiglia_codice
          WHERE ce.customer_id = $1 AND ce.tipo = 'carrello.add'
            AND ce.created_at >= now() - make_interval(days => $2::int)
         UNION ALL
         SELECT f.codice AS fam, a.codice_linea AS cl
           FROM carrelli c
           JOIN carrello_items ci ON ci.carrello_id = c.id
           JOIN varianti v ON v.codice = ci.variante_codice
           JOIN articoli a ON a.id = v.articolo_id
           JOIN famiglie f ON f.codice = a.famiglia_codice
          WHERE c.cliente_id = $1 AND ci.salvato = true
       ) x GROUP BY x.fam, x.cl`,
      customerId,
      days,
    );
    const famiglie = new Map<string, number>();
    const articoli = new Map<string, number>();
    for (const r of rows) {
      if (r.fam) famiglie.set(r.fam, (famiglie.get(r.fam) ?? 0) + Number(r.n));
      if (r.cl) articoli.set(r.cl, (articoli.get(r.cl) ?? 0) + Number(r.n));
    }
    return { famiglie: this.normalizza(famiglie), articoli: this.normalizza(articoli) };
  }

  /** Famiglie presenti nei progetti del cliente. */
  private async progettiCliente(customerId: number): Promise<Map<string, number>> {
    const rows = await this.prisma.$queryRawUnsafe<{ fam: string; n: bigint }[]>(
      `SELECT f.codice AS fam, count(*)::bigint AS n
         FROM progetto_items pi
         JOIN progetti p ON p.id = pi.progetto_id
         JOIN varianti v ON v.codice = pi.variante_codice
         JOIN articoli a ON a.id = v.articolo_id
         JOIN famiglie f ON f.codice = a.famiglia_codice
        WHERE p.cliente_id = $1 GROUP BY f.codice`,
      customerId,
    );
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.fam, Number(r.n));
    return this.normalizza(map);
  }

  /** Affinità: famiglie preferite dai clienti simili, pesate per il coseno. */
  private async affinitaCliente(customerId: number): Promise<Map<string, number>> {
    const simi = await this.insight.simili(customerId, 5);
    const combined = new Map<string, number>();
    for (const s of simi) {
      const prefs = await this.acquistiCliente(s.customerId);
      for (const [fc, w] of prefs) combined.set(fc, (combined.get(fc) ?? 0) + s.score * w);
    }
    return this.normalizza(combined);
  }

  /** Ordine di ripiego quando il cliente non ha segnali: famiglie più vendute in assoluto. */
  private async famiglieBestSeller(): Promise<Map<string, number>> {
    const rows = await this.prisma.$queryRawUnsafe<{ fam: string; n: bigint }[]>(
      `SELECT x.fam, sum(x.n)::bigint AS n FROM (
         SELECT f.codice AS fam, count(*) AS n
           FROM righe_ordini ro JOIN varianti v ON v.codice = ro.codice_prodotto
           JOIN articoli a ON a.id = v.articolo_id JOIN famiglie f ON f.codice = a.famiglia_codice
          GROUP BY f.codice
         UNION ALL
         SELECT f.codice AS fam, count(*) AS n
           FROM righe_ordini ro JOIN articoli a ON a.codice_linea = ro.codice_prodotto
           JOIN famiglie f ON f.codice = a.famiglia_codice
          GROUP BY f.codice
       ) x GROUP BY x.fam`,
    );
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.fam, Number(r.n));
    return this.normalizza(map);
  }

  // ── Intento semantico del prompt ───────────────────────────────────────────

  /** Coseno prompt→articolo dentro il pool. Filtro soft: se i coseni sono piatti
   *  (prompt generico) non taglia nulla. Ritorna null se nessun intento rilevato. */
  private async intentoSemantico(prompt: string, pool: Candidato[]): Promise<Map<string, number> | null> {
    if (!prompt?.trim() || !pool.length) return null;
    const vec = await this.embedding.embedText(prompt);
    if (!vec) return null;
    const rows = await this.prisma.$queryRawUnsafe<{ id: number; text_vec: number[] }[]>(
      `SELECT e.articolo_id AS id, e.text_vec FROM articolo_embedding e WHERE e.articolo_id = ANY($1::int[])`,
      pool.map((c) => c.id),
    );
    const byId = new Map<number, number[]>();
    for (const r of rows) byId.set(r.id, r.text_vec);
    const scores = pool.map((c) => ({
      c,
      s: byId.has(c.id) ? EmbeddingService.cosine(vec, byId.get(c.id) as number[]) : 0,
    }));
    const best = scores.reduce((m, x) => Math.max(m, x.s), 0);
    const floor = parseFloat(process.env.BOX_SEMANTIC_FLOOR || '0.45');
    const margin = parseFloat(process.env.BOX_SEMANTIC_MARGIN || '0.05');
    const kept = scores.filter((x) => x.s >= Math.max(floor, best - margin));
    if (!kept.length) return null;
    const out = new Map<string, number>();
    for (const x of kept) out.set(x.c.codiceLinea, x.s);
    return out;
  }

  // ── Score e arricchimento ──────────────────────────────────────────────────

  private pesiNormalizzati(raw: Prisma.JsonValue | null): PesiSegnali {
    const base = { ...DEFAULT_PESI, ...(raw && typeof raw === 'object' ? (raw as unknown as PesiSegnali) : {}) };
    const tot = base.acquisti + base.tracking + base.progetti + base.affinita;
    if (!(tot > 0)) return DEFAULT_PESI;
    return {
      acquisti: base.acquisti / tot,
      tracking: base.tracking / tot,
      progetti: base.progetti / tot,
      affinita: base.affinita / tot,
    };
  }

  private scoreCandidato(c: Candidato, pesi: PesiSegnali, s: Segnali): number {
    const trackFam = s.tracking.famiglie.get(c.famigliaCodice) ?? 0;
    const trackArt = s.tracking.articoli.get(c.codiceLinea) ?? 0;
    return (
      pesi.acquisti * (s.acquisti.get(c.famigliaCodice) ?? 0) +
      pesi.tracking * Math.max(trackFam, trackArt) +
      pesi.progetti * (s.progetti.get(c.famigliaCodice) ?? 0) +
      pesi.affinita * (s.affinita.get(c.famigliaCodice) ?? 0)
    );
  }

  private normalizza(map: Map<string, number>): Map<string, number> {
    if (!map.size) return map;
    let max = 0;
    for (const w of map.values()) if (w > max) max = w;
    if (max <= 0) return map;
    const out = new Map<string, number>();
    for (const [k, v] of map) out.set(k, v / max);
    return out;
  }

  /** Prezzo + disponibilità + promo per i candidati scelti. */
  private async arricchisci(box: Prisma.SuggestionBoxGetPayload<Record<string, never>>, top: Candidato[], codiceListino?: string | null) {
    const ids = top.map((c) => c.id);
    const [arts, promoMap] = await Promise.all([
      this.integrazione.arricchisciBoxArticoli(ids, codiceListino ?? null),
      box.soloInOfferta ? this.promozioniPerArticoli(ids) : Promise.resolve(new Map<string, { titolo: string; tipo: string; valore: number | null }>()),
    ]);
    return arts.map((a: any) => ({ ...a, promo: promoMap.get(a.id) ?? null }));
  }

  private async promozioniPerArticoli(ids: number[]): Promise<Map<string, { titolo: string; tipo: string; valore: number | null }>> {
    if (!ids.length) return new Map();
    const rows = await this.prisma.$queryRawUnsafe<{ cl: string; titolo: string; tipo: string; valore: string | null }[]>(
      `SELECT a.codice_linea AS cl, p.titolo, p.tipo, p.valore::text AS valore
         FROM promozioni p
         JOIN articoli a ON (array_length(p.articoli, 1) IS NULL
              OR a.codice_linea = ANY(p.articoli)
              OR EXISTS (SELECT 1 FROM varianti v WHERE v.articolo_id = a.id AND v.codice = ANY(p.articoli)))
        WHERE p.attiva = true AND p.data_inizio <= now() AND p.data_fine >= now()
          AND (array_length(p.famiglie, 1) IS NULL OR a.famiglia_codice = ANY(p.famiglie))
          AND a.id = ANY($1::int[])`,
      ids,
    );
    const map = new Map<string, { titolo: string; tipo: string; valore: number | null }>();
    for (const r of rows) {
      if (!map.has(r.cl)) map.set(r.cl, { titolo: r.titolo, tipo: r.tipo, valore: r.valore ? Number(r.valore) : null });
    }
    return map;
  }
}
