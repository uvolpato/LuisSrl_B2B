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
  *  3. score pesato per box: acquisti·w1 + tracking·w2 + progetti·w3 + affinità·w4 + profilo·w5
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
 *  - la dashboard non si rompe mai: fallback deterministico su best-seller, poi random;
 *  - un box senza candidati mostra articoli random invece di sparire;
 */

interface PesiSegnali {
  acquisti: number;
  tracking: number;
  progetti: number;
  affinita: number;
  profilo: number;
}

const DEFAULT_PESI: PesiSegnali = { acquisti: 0.4, tracking: 0.25, progetti: 0.2, affinita: 0.15, profilo: 0 };

/** customerId sentinella per i box "generale" (cache condivisa da tutti i clienti). */
const GENERALE_ID = 0;

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
  profilo: Map<string, number>;
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

  private freqGiorni(): number {
    const v = parseInt(process.env.DASHBOARD_FREQUENZA_GIORNI || '7', 10);
    return Number.isFinite(v) && v > 0 ? v : 7;
  }

  private maxClientiNotte(): number {
    const v = parseInt(process.env.DASHBOARD_MAX_CLIENTI_NOTTE || '200', 10);
    return Number.isFinite(v) && v > 0 ? v : 200;
  }

  /**
   * Box attivi per un cliente. Sola lettura: i box restano congelati fino alla
   * prossima generazione schedulata. Un box senza cache (primo accesso del cliente,
   * o box nuovo) viene generato al volo una tantum; i generale leggono la cache condivisa.
   */
  async getSuggerimenti(customerId: number, codiceListino?: string | null) {
    const boxes = await this.prisma.suggestionBox.findMany({
      where: { attiva: true },
      orderBy: [{ ordinamento: 'asc' }, { id: 'asc' }],
    });
    const [clienteCached, generaleCached] = await Promise.all([
      this.prisma.dashboardBox.findMany({ where: { customerId } }),
      this.prisma.dashboardBox.findMany({ where: { customerId: GENERALE_ID } }),
    ]);

    // Cache cliente orfana (box non più attivo o diventato generale) → rimuovi.
    const clienteAttivi = new Set(boxes.filter((b) => b.ambito !== 'generale').map((b) => b.id));
    const orfane = clienteCached.filter((c) => !clienteAttivi.has(c.boxId));
    if (orfane.length) {
      await this.prisma.dashboardBox.deleteMany({ where: { customerId, boxId: { in: orfane.map((o) => o.boxId) } } });
    }

    // Dedupe tra box: i codici già assegnati ad altri box non vanno riproposti.
    // I box generale sono condivisi (customerId=0); i box cliente cedono rispetto
    // ai generale (escludono anche ciò che il generale mostra già).
    const usatiCliente = new Set<string>();
    const usatiGenerale = new Set<string>();
    for (const c of clienteCached) for (const k of this.codiciDaProdotti(c.prodotti)) usatiCliente.add(k);
    for (const c of generaleCached) for (const k of this.codiciDaProdotti(c.prodotti)) usatiGenerale.add(k);

    // Fase 1: genera i box generale mancanti (dedupe tra loro), così i box cliente
    // (fase 2) sanno cosa il generale mostra già.
    for (const box of boxes.filter((b) => b.ambito === 'generale')) {
      if (generaleCached.some((c) => c.boxId === box.id)) continue;
      try {
        const { articoli, rationale } = await this.generaBoxGenerale(box, codiceListino, usatiGenerale);
        if (articoli.length) {
          for (const k of this.codiciDaProdotti(articoli)) usatiGenerale.add(k);
          await this.upsertCache(GENERALE_ID, box, articoli, rationale);
          generaleCached.push({ id: 0, customerId: GENERALE_ID, boxId: box.id, titolo: box.titolo, rationale, prodotti: articoli as never, generatoIl: new Date() });
        }
      } catch (e) {
        this.log.warn(`box generale #${box.id} "${box.titolo}" fallito: ${(e as Error).message}`);
      }
    }

    const result: { boxId: number; titolo: string; rationale: string | null; articoli: any[] }[] = [];
    for (const box of boxes) {
      const generale = box.ambito === 'generale';
      const row = (generale ? generaleCached : clienteCached).find((c) => c.boxId === box.id);
      if (row) {
        result.push({ boxId: box.id, titolo: row.titolo, rationale: row.rationale, articoli: row.prodotti as unknown[] });
        continue;
      }
      try {
        const esclusi = generale ? usatiGenerale : new Set([...usatiCliente, ...usatiGenerale]);
        const { articoli, rationale } = generale
          ? await this.generaBoxGenerale(box, codiceListino, esclusi)
          : await this.generaBox(box, customerId, codiceListino, esclusi);
        if (articoli.length) {
          for (const k of this.codiciDaProdotti(articoli)) (generale ? usatiGenerale : usatiCliente).add(k);
          await this.upsertCache(generale ? GENERALE_ID : customerId, box, articoli, rationale);
          result.push({ boxId: box.id, titolo: box.titolo, rationale, articoli });
        }
      } catch (e) {
        this.log.warn(`box #${box.id} "${box.titolo}" fallito: ${(e as Error).message}`);
      }
    }
    return { boxes: result };
  }

  /** Rigenerazione immediata dei soli box `cliente` di un cliente (i generale non si toccano). */
  async rigeneraCliente(customerId: number, codiceListino?: string | null) {
    const boxes = await this.prisma.suggestionBox.findMany({
      where: { attiva: true, ambito: { not: 'generale' } },
      orderBy: [{ ordinamento: 'asc' }, { id: 'asc' }],
    });
    await this.prisma.dashboardBox.deleteMany({ where: { customerId, boxId: { in: boxes.map((b) => b.id) } } });

    // Escludi anche ciò che i box generale (condivisi) mostrano già.
    const generaleCached = await this.prisma.dashboardBox.findMany({ where: { customerId: GENERALE_ID } });
    const usati = new Set<string>();
    for (const c of generaleCached) for (const k of this.codiciDaProdotti(c.prodotti)) usati.add(k);

    const result: { boxId: number; titolo: string; rationale: string | null; articoli: any[] }[] = [];
    for (const box of boxes) {
      try {
        const { articoli, rationale } = await this.generaBox(box, customerId, codiceListino, usati);
        if (articoli.length) {
          for (const k of this.codiciDaProdotti(articoli)) usati.add(k);
          await this.upsertCache(customerId, box, articoli, rationale);
          result.push({ boxId: box.id, titolo: box.titolo, rationale, articoli });
        }
      } catch (e) {
        this.log.warn(`box #${box.id} "${box.titolo}" fallito: ${(e as Error).message}`);
      }
    }
    return { boxes: result };
  }

  /** Rigenera i box `generale` (cache condivisa customerId=0). */
  async rigeneraGenerale(codiceListino?: string | null) {
    const boxes = await this.prisma.suggestionBox.findMany({
      where: { attiva: true, ambito: 'generale' },
      orderBy: [{ ordinamento: 'asc' }, { id: 'asc' }],
    });
    await this.prisma.dashboardBox.deleteMany({ where: { customerId: GENERALE_ID } });
    const usati = new Set<string>();
    for (const box of boxes) {
      try {
        const { articoli, rationale } = await this.generaBoxGenerale(box, codiceListino, usati);
        if (articoli.length) {
          for (const k of this.codiciDaProdotti(articoli)) usati.add(k);
          await this.upsertCache(GENERALE_ID, box, articoli, rationale);
        }
      } catch (e) {
        this.log.warn(`box generale #${box.id} "${box.titolo}" fallito: ${(e as Error).message}`);
      }
    }
  }

  /** Reset totale (admin): svuota la cache e rigenera i box generale. I box cliente
   *  si rigenerano al prossimo accesso di ciascun cliente (o alla prossima notte). */
  async rigeneraTutti() {
    await this.prisma.dashboardBox.deleteMany({});
    const codiceListino = (await this.integrazione.getFirstListino())?.codice_listino ?? 'LIS1';
    await this.rigeneraGenerale(codiceListino);
  }

  /**
   * Notturno: rigenera i box generale + una finestra di clienti con cache più vecchia
   * di FREQUENZA_GIORNI (o senza cache), max MAX_CLIENTI_NOTTE, i più stantii per primi.
   * Spalma il carico su più notti senza mai processare tutti i clienti insieme.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async generazioneNotturna() {
    if (this.batchRunning) {
      this.log.warn('Batch dashboard_boxes già in esecuzione, salto il run');
      return;
    }
    this.batchRunning = true;
    const logId = await this.startBatchLog();
    try {
      const fallback = (await this.integrazione.getFirstListino())?.codice_listino ?? 'LIS1';
      await this.rigeneraGenerale(fallback);

      const customers = await this.prisma.customer.findMany({
        where: { stato: 'ATTIVO' },
        select: { id: true, codiceListino: true },
      });
      const mins = await this.prisma.dashboardBox.groupBy({
        by: ['customerId'],
        _min: { generatoIl: true },
        where: { customerId: { not: GENERALE_ID } },
      });
      const minMap = new Map(mins.map((m) => [m.customerId, m._min.generatoIl]));
      const cutoff = new Date(Date.now() - this.freqGiorni() * 86_400_000);
      const stale = customers
        .filter((c) => { const g = minMap.get(c.id); return !g || g < cutoff; })
        .sort((a, b) => (minMap.get(a.id)?.getTime() ?? 0) - (minMap.get(b.id)?.getTime() ?? 0))
        .slice(0, this.maxClientiNotte());

      let ok = 0;
      let errori = 0;
      for (const c of stale) {
        try { await this.rigeneraCliente(c.id, c.codiceListino ?? fallback); ok++; }
        catch (e) { errori++; this.log.warn(`Rigenerazione cliente #${c.id} fallita: ${(e as Error).message}`); }
      }
      this.log.log(`Notturno box: generale ok, ${ok} clienti rigenerati, ${errori} errori (finestra ${stale.length})`);
      await this.completeBatchLog(logId, stale.length, ok, errori);
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
    articoli: any[],
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

  /** Genera i candidati di un box per un cliente (engine deterministico + LLM opzionale). */
  async generaBox(
    box: Prisma.SuggestionBoxGetPayload<Record<string, never>>,
    customerId: number,
    codiceListino?: string | null,
    esclusi?: Set<string>,
  ): Promise<{ articoli: any[]; rationale: string | null }> {
    const pesi = this.pesiNormalizzati(box.pesi);
    const [pool, segnali] = await Promise.all([
      this.poolVincoli(box, customerId, esclusi),
      this.segnaliCliente(customerId),
    ]);
    if (!pool.length) {
      const articoli = await this.randomFallback(box, codiceListino, esclusi);
      return { articoli, rationale: articoli.length ? await this.generaRationale(box, articoli) : null };
    }
    const profilo = await this.profiloTesto(customerId);
    const digest = [this.digestCliente(segnali), profilo].filter(Boolean).join('\n');
    return this.selezionaEArricchisci(
      box, pool, (c) => this.scoreCandidato(c, pesi, segnali), codiceListino, digest, profilo,
    );
  }

  /** Box "generale": stessa pipeline ma ranking sui dati di vendita globali (best-seller). */
  async generaBoxGenerale(
    box: Prisma.SuggestionBoxGetPayload<Record<string, never>>,
    codiceListino?: string | null,
    esclusi?: Set<string>,
  ): Promise<{ articoli: any[]; rationale: string | null }> {
    const pool = await this.poolVincoli(box, GENERALE_ID, esclusi);
    if (!pool.length) {
      const articoli = await this.randomFallback(box, codiceListino, esclusi);
      return { articoli, rationale: articoli.length ? await this.generaRationale(box, articoli) : null };
    }
    const best = await this.famiglieBestSeller();
    const digest = [...best.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f]) => f).join(', ');
    return this.selezionaEArricchisci(
      box, pool, (c) => best.get(c.famigliaCodice) ?? 0, codiceListino,
      digest ? `Famiglie più vendute in generale: ${digest}` : '',
    );
  }

  /** Fase 2 attiva? Default OFF: si torna sempre al ranking deterministico. */
  private llmSelectionEnabled(): boolean {
    return (process.env.DASHBOARD_LLM_SELECTION || 'off') === 'on';
  }

  /** Digest umano delle famiglie d'interesse del cliente (per il contesto LLM). */
  private digestCliente(s: Segnali): string {
    const famiglie = new Set<string>([...s.acquisti.keys(), ...s.tracking.famiglie.keys(), ...s.progetti.keys()]);
    if (!famiglie.size) return '';
    const ordinate = [...famiglie]
      .sort((a, b) =>
        ((s.acquisti.get(b) ?? 0) + (s.tracking.famiglie.get(b) ?? 0) + (s.progetti.get(b) ?? 0))
        - ((s.acquisti.get(a) ?? 0) + (s.tracking.famiglie.get(a) ?? 0) + (s.progetti.get(a) ?? 0)));
    return `Famiglie di interesse del cliente: ${ordinate.slice(0, 5).join(', ')}`;
  }

  /**
   * Profilo commerciale del cliente (sintesi AI + profilo anagrafico): arricchisce
   * sia la ricerca semantica (embedding del prompt) sia il contesto dell'LLM.
   */
  private async profiloTesto(customerId: number): Promise<string> {
    const parti: string[] = [];
    const ins = await this.insight.latest(customerId);
    if (ins?.testo?.trim()) parti.push(ins.testo.trim());
    const prof = await this.prisma.customerProfile.findUnique({
      where: { customerId },
      select: { settore: true, interessiPrincipali: true, nonCompreraMai: true },
    });
    if (prof?.settore?.trim()) parti.push(`Settore: ${prof.settore.trim()}`);
    const interessi = Array.isArray(prof?.interessiPrincipali) ? (prof.interessiPrincipali as string[]) : [];
    if (interessi.length) parti.push(`Interessi: ${interessi.join('; ')}`);
    const nonVuole = Array.isArray(prof?.nonCompreraMai) ? (prof.nonCompreraMai as string[]) : [];
    if (nonVuole.length) parti.push(`Da NON proporre: ${nonVuole.join('; ')}`);
    return parti.join('\n');
  }

  /** Estrae i codici (campo `id`) dagli articoli arricchiti di un box. */
  private codiciDaProdotti(prodotti: unknown): string[] {
    if (!Array.isArray(prodotti)) return [];
    return (prodotti as any[]).map((p) => p?.id).filter((c): c is string => typeof c === 'string');
  }

  // ── Fase 3: planner a edit-time + anteprima test ───────────────────────────

  /**
   * Interpreta il prompt del box e restituisce un piano di configurazione
   * (vocabolario chiuso, niente SQL): ricercaTesto, escludiAcquistati,
   * soloInOfferta, nArticoli, pesi, note. L'admin lo revisiona e salva.
   */
  async pianifica(prompt: string) {
    if (!prompt?.trim()) return null;
    const p =
      `Sei l'editor di box di un e-commerce B2B di vasi e complementi per fioristi.\n` +
      `Dato il prompt del box qui sotto, estrai un PIANO di configurazione deterministico.\n` +
      `Prompt: "${prompt.trim()}"\n\n` +
      `Rispondi SOLO con JSON valido, senza markdown, con questi campi:\n` +
      `{"ricercaTesto":"stringa di ricerca distillata dal prompt","escludiAcquistati":bool,"soloInOfferta":bool,"nArticoli":int,"pesi":{"acquisti":num,"tracking":num,"progetti":num,"affinita":num},"note":"una riga che spiega il piano"}\n` +
      `Regole: nArticoli tra 4 e 24; i pesi sono proporzioni relative (non devono sommare 1); soloInOfferta=true solo se il prompt parla di offerte/promo; escludiAcquistati=true solo se il prompt implica novità/mai comprati.`;
    const parsed = await this.chiamaJson(p, 'piano box');
    if (!parsed) return null;
    const n = Math.min(24, Math.max(4, Number(parsed.nArticoli) || 8));
    const pesi = { ...DEFAULT_PESI };
    if (parsed.pesi && typeof parsed.pesi === 'object') {
      for (const k of Object.keys(pesi) as (keyof PesiSegnali)[]) {
        const v = Number((parsed.pesi as Record<string, unknown>)[k]);
        if (Number.isFinite(v) && v >= 0) pesi[k] = v;
      }
    }
    return {
      ricercaTesto: typeof parsed.ricercaTesto === 'string' ? parsed.ricercaTesto.trim() : '',
      escludiAcquistati: !!parsed.escludiAcquistati,
      soloInOfferta: !!parsed.soloInOfferta,
      nArticoli: n,
      pesi,
      note: typeof parsed.note === 'string' ? parsed.note.trim() : '',
    };
  }

  /**
   * Anteprima dry-run: esegue il motore su un cliente campione (o quello passato)
   * SENZA scrivere la cache, e restituisce gli articoli che uscirebbero.
   */
  async testBox(
    input: {
      titolo?: string; prompt?: string; ricercaTesto?: string | null; ambito?: string;
      nArticoli?: number; pesi?: Record<string, number>; soloInOfferta?: boolean;
      escludiAcquistati?: boolean; scopeFamiglia?: string; scopeRaccolta?: string;
    },
    clienteId?: number,
  ) {
    const target = clienteId ?? (await this.prisma.customer.findFirst({ where: { stato: 'ATTIVO' }, select: { id: true } }))?.id;
    if (!target) return { articoli: [], rationale: null };

    const box = {
      id: 0, titolo: input.titolo ?? 'Test', prompt: input.prompt ?? '',
      ricercaTesto: input.ricercaTesto || null,
      ambito: input.ambito === 'generale' ? 'generale' : 'cliente',
      nArticoli: input.nArticoli ?? 8,
      pesi: (input.pesi ?? { ...DEFAULT_PESI }) as never,
      soloInOfferta: !!input.soloInOfferta, escludiAcquistati: input.escludiAcquistati !== false,
      scopeFamiglia: input.scopeFamiglia ?? '', scopeRaccolta: input.scopeRaccolta ?? '',
      attiva: true, ordinamento: 0,
      createdAt: new Date(), updatedAt: new Date(),
    } as unknown as Prisma.SuggestionBoxGetPayload<Record<string, never>>;

    const listino = await this.listinoDi(target);
    return box.ambito === 'generale'
      ? this.generaBoxGenerale(box, listino)
      : this.generaBox(box, target, listino);
  }

  private async listinoDi(customerId: number): Promise<string | null> {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { codiceListino: true } });
    if (customer?.codiceListino) return customer.codiceListino;
    return (await this.integrazione.getFirstListino())?.codice_listino ?? 'LIS1';
  }

  /** Chiama Gemini chiedendo JSON e lo parsa in modo tollerante. Null su errore. */
  private async chiamaJson(prompt: string, label: string): Promise<Record<string, unknown> | null> {
    try {
      const raw = await this.integrazione.generaSelezioneBox(prompt);
      const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/g, '').trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start === -1 || end <= start) return null;
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch (e) {
      this.log.warn(`${label} fallita: ${(e as Error).message}`);
      return null;
    }
  }

  /**
   * Filtro semantico soft + ranking (scoreOf) + scelta finale + arricchimento.
   * Con DASHBOARD_LLM_SELECTION=on, l'LLM sceglie/ordina N tra i primi M candidati
   * (pesati coi segnali) e scrive il rationale; altrimenti (o su fallimento LLM)
   * resta il top-N deterministico. La selezione casuale scatta solo a ranking piatto.
   */
  private async selezionaEArricchisci(
    box: Prisma.SuggestionBoxGetPayload<Record<string, never>>,
    pool: Candidato[],
    scoreOf: (c: Candidato) => number,
    codiceListino?: string | null,
    digest?: string,
    profilo?: string,
  ): Promise<{ articoli: any[]; rationale: string | null }> {
    let candidati = pool;
    const testoRicerca = box.ricercaTesto?.trim() || box.prompt;
    const sem = await this.intentoSemantico([testoRicerca, profilo].filter(Boolean).join('\n'), pool);
    if (sem) {
      const semSet = new Set(sem.keys());
      const inSem = pool.filter((c) => semSet.has(c.codiceLinea));
      // Tutti gli articoli semanticamente rilevanti, nessun taglio duro: la
      // pertinenza di dettaglio la decide il ranking (e l'LLM se attivo).
      if (inSem.length) candidati = inSem;
    }

    let ordinati = candidati.map((c) => ({ c, score: scoreOf(c) })).sort((a, b) => b.score - a.score);
    const maxScore = ordinati.reduce((m, x) => Math.max(m, x.score), 0);
    if (maxScore <= 0) {
      const shuffled = [...candidati];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      ordinati = shuffled.map((c) => ({ c, score: 0 }));
    }

    if (this.llmSelectionEnabled()) {
      const m = Math.min(Math.max(box.nArticoli * 3, box.nArticoli + 10), 30);
      const topPool = ordinati.slice(0, m).map((x) => x.c);
      const arricchiti = await this.arricchisci(box, topPool, codiceListino);
      const scelta = await this.selezioneLlm(box, arricchiti as any[], digest);
      if (scelta) {
        const byCod = new Map((arricchiti as any[]).map((a) => [a.id, a]));
        const finali = scelta.codici.map((cod) => byCod.get(cod)).filter(Boolean);
        if (finali.length) return { articoli: finali, rationale: scelta.rationale || null };
      }
    }

    const top = ordinati.slice(0, box.nArticoli).map((x) => x.c);
    const articoli = await this.arricchisci(box, top, codiceListino);
    const rationale = articoli.length ? await this.generaRationale(box, articoli) : null;
    return { articoli, rationale };
  }

  /**
   * Chiede all'LLM di scegliere/ordinare N articoli tra i candidati arricchiti.
   * Output JSON validato: solo codici esistenti tra i candidati, max N. Fallisce
   * in modo silenzioso (null) così il chiamante ripiega sul top-N deterministico.
   */
  private async selezioneLlm(
    box: Prisma.SuggestionBoxGetPayload<Record<string, never>>,
    candidati: any[],
    digest?: string,
  ): Promise<{ codici: string[]; rationale: string | null } | null> {
    if (!candidati.length) return null;
    const elenco = candidati.map((a, i) => {
      const fam = a.famiglia?.nome ?? '';
      const prezzo = a.prezzo != null ? `, prezzo €${a.prezzo}` : '';
      const disp = a.disponibilita ? `, ${a.disponibilita}` : '';
      const promo = a.promo?.titolo ? `, promo: ${a.promo.titolo}` : '';
      return `${i + 1}. ${a.id} — ${a.nome} (famiglia ${fam}${prezzo}${disp}${promo})`;
    }).join('\n');

    const prompt =
      `Sei il motore di raccomandazione di un e-commerce B2B di vasi e complementi per fioristi.\n` +
      `Box da comporre: "${box.titolo}". Intento: ${box.prompt || box.titolo}.\n` +
      (digest ? `Contesto:\n${digest}\n` : '') +
      `Scegli ESATTAMENTE ${box.nArticoli} prodotti dall'elenco qui sotto, indicando i codici nell'ordine che ritieni più adatto.\n` +
      `Elenco candidati:\n${elenco}\n\n` +
      `Rispondi SOLO con un JSON valido, senza markdown:\n` +
      `{"articoli": ["codice", "codice", ...], "rationale": "una frase (max 20 parole) che spiega al cliente perché questi prodotti gli interessano"}`;

    try {
      const parsed = await this.chiamaJson(prompt, 'selezione box');
      if (!parsed) return null;
      const valid = new Set(candidati.map((a) => a.id));
      const codici = Array.isArray(parsed.articoli)
        ? (parsed.articoli as unknown[]).map((c) => String(c)).filter((c) => valid.has(c))
        : [];
      if (!codici.length) return null;
      const rationale = typeof parsed.rationale === 'string' && parsed.rationale.trim()
        ? parsed.rationale.trim().slice(0, 200)
        : null;
      return { codici: codici.slice(0, box.nArticoli), rationale };
    } catch (e) {
      this.log.warn(`selezione LLM box #${box.id} fallita: ${(e as Error).message}`);
      return null;
    }
  }

  /** Famiglie più vendute in assoluto (ranking dei box generale). */
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

  // ── Vincoli (SQL) ──────────────────────────────────────────────────────────

  private async poolVincoli(
    box: Pick<Prisma.SuggestionBoxGetPayload<Record<string, never>>, 'soloInOfferta' | 'escludiAcquistati' | 'scopeFamiglia' | 'scopeRaccolta'>,
    customerId: number,
    esclusi?: Set<string>,
  ): Promise<Candidato[]> {
    const conds: string[] = [`a.configurato = true`, `a.stato = 'ATTIVO'`, `f.stato = 'ATTIVO'`];
    const params: unknown[] = [];
    let idx = 1;

    if (esclusi?.size) {
      conds.push(`NOT (a.codice_linea = ANY($${idx}::text[]))`);
      params.push([...esclusi]);
      idx++;
    }
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
        WHERE v.articolo_id = a.id AND o.customer_id = $${idx})`);
      conds.push(`NOT EXISTS (
        SELECT 1 FROM righe_ordini ro JOIN ordini_clienti o ON o.id = ro.ordine_id
        WHERE ro.codice_prodotto = a.codice_linea AND o.customer_id = $${idx})`);
      params.push(customerId);
      idx++;
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
     const [acquisti, tracking, progetti, affinita, profilo] = await Promise.all([
       this.acquistiCliente(customerId),
       this.trackingCliente(customerId),
       this.progettiCliente(customerId),
       this.affinitaCliente(customerId),
       this.profiloCliente(customerId),
     ]);
     return { acquisti, tracking, progetti, affinita, profilo };
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

  /** Segnale dal profilo intelligence: pesi le famiglie menzionate negli interessi principali. */
  private async profiloCliente(customerId: number): Promise<Map<string, number>> {
    return new Map();
  }


  // ── Intento semantico del prompt ───────────────────────────────────────────

  /** Coseno prompt→articolo dentro il pool. Filtro soft: tiene TUTTI gli articoli
   *  con coseno positivo (nessun taglio duro: la scelta finale spetta al ranking
   *  pesato, ed eventualmente all'LLM). Ritorna null se nessun intento rilevato. */
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
    const out = new Map<string, number>();
    for (const c of pool) {
      const s = byId.has(c.id) ? EmbeddingService.cosine(vec, byId.get(c.id) as number[]) : 0;
      if (s > 0) out.set(c.codiceLinea, s);
    }
    return out.size ? out : null;
  }

  // ── Score e arricchimento ──────────────────────────────────────────────────

   private pesiNormalizzati(raw: Prisma.JsonValue | null): PesiSegnali {
     const base = { ...DEFAULT_PESI, ...(raw && typeof raw === 'object' ? (raw as unknown as PesiSegnali) : {}) };
     const tot = base.acquisti + base.tracking + base.progetti + base.affinita + base.profilo;
     if (!(tot > 0)) return DEFAULT_PESI;
     return {
       acquisti: base.acquisti / tot,
       tracking: base.tracking / tot,
       progetti: base.progetti / tot,
       affinita: base.affinita / tot,
       profilo: base.profilo / tot,
     };
   }

   private scoreCandidato(c: Candidato, pesi: PesiSegnali, s: Segnali): number {
     const trackFam = s.tracking.famiglie.get(c.famigliaCodice) ?? 0;
     const trackArt = s.tracking.articoli.get(c.codiceLinea) ?? 0;
     return (
       pesi.acquisti * (s.acquisti.get(c.famigliaCodice) ?? 0) +
       pesi.tracking * Math.max(trackFam, trackArt) +
       pesi.progetti * (s.progetti.get(c.famigliaCodice) ?? 0) +
       pesi.affinita * (s.affinita.get(c.famigliaCodice) ?? 0) +
       pesi.profilo * (s.profilo.get(c.famigliaCodice) ?? 0)
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

  /** Fallback random: restituisce N articoli attivi/configurati a caso. */
  private async randomFallback(
    box: Prisma.SuggestionBoxGetPayload<Record<string, never>>,
    codiceListino?: string | null,
    esclusi?: Set<string>,
  ) {
    const conds: string[] = [`a.configurato = true`, `a.stato = 'ATTIVO'`, `f.stato = 'ATTIVO'`];
    const params: unknown[] = [];
    let idx = 1;

    if (esclusi?.size) {
      conds.push(`NOT (a.codice_linea = ANY($${idx}::text[]))`);
      params.push([...esclusi]);
      idx++;
    }
    if (box.soloInOfferta) {
      conds.push(`EXISTS (
        SELECT 1 FROM promozioni p
        WHERE p.attiva = true AND p.data_inizio <= now() AND p.data_fine >= now()
          AND (array_length(p.articoli, 1) IS NULL OR a.codice_linea = ANY(p.articoli) OR EXISTS (
            SELECT 1 FROM varianti v WHERE v.articolo_id = a.id AND v.codice = ANY(p.articoli)))
          AND (array_length(p.famiglie, 1) IS NULL OR a.famiglia_codice = ANY(p.famiglie))
      )`);
    }
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

    const rows = await this.prisma.$queryRawUnsafe<Candidato[]>(
      `SELECT a.id, a.codice_linea AS "codiceLinea", a.famiglia_codice AS "famigliaCodice"
       FROM articoli a
       JOIN famiglie f ON f.codice = a.famiglia_codice
       WHERE ${conds.join(' AND ')}
       ORDER BY random()
       LIMIT $${idx}::int`,
      ...params, box.nArticoli,
    );
    if (!rows.length) return [];
    return this.arricchisci(box, rows, codiceListino);
  }
}

