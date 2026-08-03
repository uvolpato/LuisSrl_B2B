import { Injectable, BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as fsp from 'fs/promises';
import { randomUUID, createHash } from 'crypto';
import { hashPassword } from '../common/password';
import { EmbeddingService } from './embedding.service';
import { AiUsageService } from '../ai-usage/ai-usage.service';
import { EventsService } from '../events/events.service';

function hexToSrgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  return [
    0.4124564 * r + 0.3575761 * g + 0.1804375 * b,
    0.2126729 * r + 0.7151522 * g + 0.0721750 * b,
    0.0193339 * r + 0.1191920 * g + 0.9503041 * b,
  ];
}

const D65: [number, number, number] = [0.95047, 1.0, 1.08883];
const LAB_EPSILON = 216.0 / 24389.0;
const LAB_KAPPA = 24389.0 / 27.0;

function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const f = (t: number) =>
    t > LAB_EPSILON ? Math.cbrt(t) : (LAB_KAPPA * t + 16) / 116;
  const fx = f(x / D65[0]);
  const fy = f(y / D65[1]);
  const fz = f(z / D65[2]);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function hexToLab(hex: string): { L: number; a: number; b: number } {
  const [r, g, b] = hexToSrgb(hex);
  const [rl, gl, bl] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  const [x, y, z] = rgbToXyz(rl, gl, bl);
  const [L, a, bLab] = xyzToLab(x, y, z);
  return { L, a, b: bLab };
}

// ponytail: mapping configurabile — quando arrivano le viste FDW reali,
// cambi i nomi view e/o le colonne qui, il resto del codice resta identico.
const CONFIG = {
  famiglie: {
    view: 'vista_integra_famiglie',
    cols: { pro_cod: 'codice', fam_descrizione: 'nome', fam_parent_id: 'codicePadre' } as const,
  },
  linee: {
    view: 'vista_integra_linee',
    cols: { pro_cod: 'codiceLinea', lin_descrizione: 'nome', lin_famiglia_id: 'famigliaCodice' } as const,
  },
  prodotti: {
    view: 'vista_integra_prodotti',
    cols: {
      pro_cod: 'codice', pro_descr: 'descrizione', pro_moddescr: 'modificabile',
      pro_cldcod01: 'cl1Cod', pro_clddescr01: 'cl1Descr', pro_clvcod01: 'cl1Val',
      pro_cldcod02: 'cl2Cod', pro_clddescr02: 'cl2Descr', pro_clvcod02: 'cl2Val',
      pro_cldcod03: 'cl3Cod', pro_clddescr03: 'cl3Descr', pro_clvcod03: 'cl3Val',
      pro_funzionalita1: 'funzionalita', pro_famiglia_id: 'famigliaId',
    } as const,
  },
};

const ASSETS_BASE_DIR = path.resolve(process.env.ASSETS_BASE_DIR || path.join(process.cwd(), '..', 'frontend', 'public', 'images'));
const ASSETS_PUBLIC_URL = process.env.ASSETS_PUBLIC_URL || '/images';
const ASSETS_CACHE_DIR = path.join(ASSETS_BASE_DIR, '.cache');

/** Rimuove i derivati in cache (miniature WebP) di un file immagine. */
async function purgeThumbCache(rel: string): Promise<void> {
  const dir = path.join(ASSETS_CACHE_DIR, path.dirname(rel));
  const base = path.basename(rel);
  try {
    const files = await fsp.readdir(dir);
    await Promise.all(
      files
        .filter((f) => f.startsWith(`${base}@`) && f.endsWith('.webp'))
        .map((f) => fsp.unlink(path.join(dir, f)).catch(() => {})),
    );
  } catch { /* cache dir assente */ }
}

type ViewType = keyof typeof CONFIG;

@Injectable()
export class IntegrazioneService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embedding: EmbeddingService,
    private readonly aiUsage: AiUsageService,
    private readonly events: EventsService,
  ) {}

  /** Mappa una riga della vista sui nomi di portale del CONFIG (BigInt → Number: non serializzabile in JSON). */
  private mapRow(cols: Record<string, string>, row: Record<string, unknown>) {
    const mapped: Record<string, unknown> = {};
    for (const [src, dst] of Object.entries(cols)) {
      const val = row[src];
      mapped[dst] = typeof val === 'bigint' ? Number(val) : (val ?? null);
    }
    return mapped;
  }

  private async queryView<T extends ViewType>(view: T) {
    const cfg = CONFIG[view];
    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM ${cfg.view}`,
    );
    return rows.map((row) => this.mapRow(cfg.cols, row));
  }

  async getFamiglie() { return this.queryView('famiglie'); }
  async getLinee() { return this.queryView('linee'); }
  async getProdotti() { return this.queryView('prodotti'); }

  async searchProdotti(search?: string, famiglia?: string, page = 1, limit = 50, sort?: string, dir?: 'asc' | 'desc') {
    const params: unknown[] = [];
    let idx = 1;
    const conds: string[] = [];

    if (search) {
      conds.push(
        `(a.pro_cod ILIKE $${idx} OR a.pro_descr ILIKE $${idx} OR f.nome ILIKE $${idx} OR l.nome ILIKE $${idx})`,
      );
      params.push(`%${search}%`);
      idx++;
    }
    if (famiglia) {
      conds.push(`a.famiglia_codice = $${idx}`);
      params.push(famiglia);
      idx++;
    }
    conds.push(`NOT EXISTS (SELECT 1 FROM varianti WHERE codice = a.pro_cod)`);
    const whereClause = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const fromClause = `FROM integra_articoli a
      LEFT JOIN integra_famiglie f ON f.codice_numerico = a.famiglia_codice
      LEFT JOIN integra_linee l ON l.codice_numerico = a.linea_codice`;

    const SORT_MAP: Record<string, string> = {
      codice: 'a.pro_cod',
      descrizione: 'a.pro_descr',
      famiglia: 'f.nome',
      linea: 'l.nome',
    };
    const dirSql = dir === 'desc' ? 'desc' : 'asc';
    const orderBySql = sort && SORT_MAP[sort] ? SORT_MAP[sort] : 'a.pro_cod';

    const countResult = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT count(*) ${fromClause} ${whereClause}`,
      ...params,
    );
    const total = Number(countResult[0].count);

    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT a.pro_cod, a.pro_descr, a.famiglia_codice, a.linea_codice,
              f.nome AS famiglia_nome, l.nome AS linea_nome
       ${fromClause} ${whereClause}
       ORDER BY ${orderBySql} ${dirSql} LIMIT $${idx} OFFSET $${idx + 1}`,
      ...params, limit, offset,
    );

    const items = rows.map((row) => ({
      codice: String(row.pro_cod ?? ''),
      descrizione: String(row.pro_descr ?? ''),
      famigliaCodice: row.famiglia_codice ? String(row.famiglia_codice) : null,
      famigliaNome: row.famiglia_nome ? String(row.famiglia_nome) : null,
      lineaCodice: row.linea_codice ? String(row.linea_codice) : null,
      lineaNome: row.linea_nome ? String(row.linea_nome) : null,
    }));

    return { items, total, page, limit };
  }

  async importaVarianti(codici: string[]) {
    const placeholders = codici.map((_, i) => `$${i + 1}`).join(',');
    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT a.*, f.nome AS famiglia_nome
       FROM integra_articoli a
       LEFT JOIN integra_famiglie f ON f.codice_numerico = a.famiglia_codice
       WHERE a.pro_cod IN (${placeholders})`,
      ...codici,
    );
    if (!rows.length) return { creati: 0, articoli: [] };

    let defaultPrompt: string | undefined;
    const sc = await this.prisma.siteConfig.findUnique({ where: { key: 'Prompt_AI_Descrizione_Articolo' } });
    if (sc?.value?.trim()) defaultPrompt = sc.value.trim();

    const existingVarianti = await this.prisma.variante.findMany({
      where: { codice: { in: codici } },
      select: { codice: true },
    });
    const existingSet = new Set(existingVarianti.map((v) => v.codice));

    // Mappa codice famiglia (numerico) → codice (FAM_* da FDW)
    const famMap = new Map<string, { proCod: string; nome: string }>();
    try {
      const famRows = await this.prisma.$queryRawUnsafe<{ codice: string; codice_numerico: string; nome: string }[]>(
        `SELECT codice, codice_numerico, nome FROM integra_famiglie WHERE codice_numerico IS NOT NULL`,
      );
      for (const r of famRows) famMap.set(r.codice_numerico, { proCod: r.codice, nome: r.nome });
    } catch { /* fallback */ }

    // Mappa codice linea (numerico) → codice (LINEA_* da FDW)
    const lineaMap = new Map<string, { proCod: string; nome: string }>();
    try {
      const lRows = await this.prisma.$queryRawUnsafe<{ codice: string; codice_numerico: string; nome: string }[]>(
        `SELECT codice, codice_numerico, nome FROM integra_linee WHERE codice_numerico IS NOT NULL`,
      );
      for (const r of lRows) lineaMap.set(r.codice_numerico, { proCod: r.codice, nome: r.nome });
    } catch { /* fallback */ }

    const upsertFamiglia = async (tx: any, codice: string | null, nome: string | null): Promise<string> => {
      if (!codice) {
        await tx.$executeRawUnsafe(
          `INSERT INTO famiglie (codice, nome, updated_at) VALUES ('INTEGRA', 'Integra (senza famiglia)', now()) ON CONFLICT (codice) DO NOTHING`,
        );
        return 'INTEGRA';
      }
      const mapped = famMap.get(codice);
      const famCodice = mapped?.proCod ?? codice;
      const famNome = mapped?.nome ?? nome ?? codice;

      // Cerca famiglia già esistente: per codice FAM_*, per nome, o per codice numerico
      const existingRows = await tx.$queryRawUnsafe(
        `SELECT codice FROM famiglie WHERE codice = $1
         UNION SELECT codice FROM famiglie WHERE LOWER(nome) = LOWER($2) AND codice != $1
         UNION SELECT codice FROM famiglie WHERE codice = $3 AND codice != $1
         LIMIT 1`,
        famCodice, famNome, codice,
      ) as { codice: string }[];
      if (existingRows.length > 0) return existingRows[0].codice;

      await tx.$executeRawUnsafe(
        `INSERT INTO famiglie (codice, nome, updated_at) VALUES ($1, $2, now()) ON CONFLICT (codice) DO UPDATE SET nome = EXCLUDED.nome, updated_at = now()`,
        famCodice, famNome,
      );
      return famCodice;
    };

    const result = await this.prisma.$transaction(async (tx) => {
      const created: { articoloId: number; codiceLinea: string; varianti: number }[] = [];
      for (const row of rows) {
        const codice = String(row.pro_cod).trim();
        const descrizione = row.pro_descr ? String(row.pro_descr).trim() : '';
        const famigliaCodice = row.famiglia_codice ? String(row.famiglia_codice).trim() : null;
        const famCodice = await upsertFamiglia(tx, famigliaCodice, row.famiglia_nome ? String(row.famiglia_nome) : null);

        // Determina codiceLinea articolo: LINEA pro_cod se la variante ha linea_codice, altrimenti pro_cod variante
        const lineaCodice = row.linea_codice ? String(row.linea_codice).trim() : null;
        const lineaEntry = lineaCodice ? lineaMap.get(lineaCodice) : undefined;
        const codiceLinea = lineaEntry?.proCod ?? codice;
        const nomeArticolo = lineaEntry?.nome || descrizione;

        const art = await tx.articolo.upsert({
          where: { codiceLinea },
          create: { codiceLinea, nome: nomeArticolo, famigliaCodice: famCodice, stato: 'NASCOSTO', promptAi: defaultPrompt },
          update: { nome: nomeArticolo, famigliaCodice: famCodice },
        });

        const dim = row.dimensione_json || null;
        if (existingSet.has(codice)) {
          if (dim) await tx.variante.update({ where: { codice }, data: { dimensioni: dim as any } });
        } else {
          await tx.variante.create({
            data: { codice, descrizione, articoloId: art.id, ...(dim ? { dimensioni: dim as any } : {}) },
          });
        }
        created.push({ articoloId: art.id, codiceLinea, varianti: 1 });
      }
      return created;
    });

    // AI: estrai colore per articoli senza colore
    for (const codiceLinea of [...new Set(result.map((a) => a.codiceLinea))]) {
      try {
        const art = await this.prisma.articolo.findUnique({
          where: { codiceLinea },
          select: { colore: true, nome: true, descrizione: true, codiceLinea: true },
        });
        if (art && !art.colore) {
          const text = [art.nome, art.descrizione].filter(Boolean).join(' — ');
          if (text) {
            const { colore, coloreRgb } = await this.estraiColoreDaTesto(art.nome, text);
            const updateData: Record<string, string | null> = {};
            if (colore) updateData.colore = colore;
            if (coloreRgb) updateData.coloreRgb = coloreRgb;
            if (Object.keys(updateData).length) {
              await this.prisma.articolo.update({ where: { codiceLinea }, data: updateData as any });
            }
          }
        }
      } catch {
        // Silenzioso: non blocca l'import se l'AI fallisce
      }
    }

    // Varianti (nuove o aggiornate) → riallinea l'embedding degli articoli coinvolti.
    // Idempotente: reembedArticolo salta gli articoli non configurati/attivi e quelli
    // con blob invariato (fonte_hash).
    for (const codiceLinea of new Set(result.map((a) => a.codiceLinea))) {
      void this.reembedArticolo(codiceLinea).catch(() => {});
    }

    return { creati: result.length, articoli: result };
  }

  /** Undo split: riaccorpa varianti negli articoli originali e cancella articoli duplicati. */
  async undoSplit() {
    // Gruppi noti: LU3258/LU3259/LU3260 (ARGO NOCCIOLA), LU3261/LU3262/LU3263 (ARGO BLU)
    const gruppi = [
      { target: 'LU3258', orfani: ['LU3259', 'LU3260'], nome: 'ARGO NOCCIOLA' },
      { target: 'LU3261', orfani: ['LU3262', 'LU3263'], nome: 'ARGO BLU' },
    ];
    const risultati: string[] = [];
    for (const g of gruppi) {
      await this.prisma.$transaction(async (tx) => {
        const art = await tx.articolo.findUnique({ where: { codiceLinea: g.target } });
        if (!art) return;
        for (const orfano of g.orfani) {
          const orfArt = await tx.articolo.findUnique({ where: { codiceLinea: orfano } });
          if (!orfArt) continue;
          await tx.variante.update({ where: { codice: orfano }, data: { articoloId: art.id } });
          await tx.immagine.deleteMany({ where: { articoloId: orfArt.id } });
          await tx.articoloRaccolta.deleteMany({ where: { articoloId: orfArt.id } });
          await tx.articolo.delete({ where: { codiceLinea: orfano } });
        }
        await tx.articolo.update({ where: { codiceLinea: g.target }, data: { nome: g.nome } });
        risultati.push(g.target);
      });
    }
    return { ripristinati: risultati };
  }

  /** Una tantum: corregge famiglie (codice → pro_cod) e aggiorna codiceLinea articoli. */
  async splitGroupedArticles() {
    const fixed: string[] = [];
    const splittati: { vecchioCodiceLinea: string; nuovoCodiceLinea: string }[] = [];
    const errori: { articolo: string; errore: string }[] = [];

    let famMap = new Map<string, { proCod: string; nome: string }>();
    try {
      const famRows = await this.prisma.$queryRawUnsafe<{ codice: string; codice_numerico: string; nome: string }[]>(
        `SELECT codice, codice_numerico, nome FROM integra_famiglie WHERE codice_numerico IS NOT NULL`,
      );
      for (const r of famRows) famMap.set(r.codice_numerico, { proCod: r.codice, nome: r.nome });
    } catch { /* fallback */ }

    const famiglie = await this.prisma.famiglia.findMany({ where: { codice: { not: 'INTEGRA' } } });
    for (const f of famiglie) {
      const mapping = famMap.get(f.codice);
      if (mapping && mapping.proCod !== f.codice) {
        try {
          await this.prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`UPDATE articoli SET famiglia_codice = $1 WHERE famiglia_codice = $2`, mapping.proCod, f.codice);
            const existing = await tx.$queryRawUnsafe<{ cnt: bigint }[]>(`SELECT count(*) AS cnt FROM famiglie WHERE codice = $1`, mapping.proCod);
            const targetExists = Number(existing[0]?.cnt ?? 0) > 0;
            if (targetExists) {
              await tx.$executeRawUnsafe(`DELETE FROM famiglie WHERE codice = $1`, f.codice);
            } else {
              await tx.$executeRawUnsafe(`UPDATE famiglie SET codice = $1, nome = $2 WHERE codice = $3`, mapping.proCod, mapping.nome, f.codice);
            }
          });
          fixed.push(f.codice);
        } catch (e: any) {
          errori.push({ articolo: `famiglia:${f.codice}`, errore: e?.message ?? String(e) });
        }
      }
    }

    // Mappa linea (numerico) → codice (LINEA_* da FDW)
    let lineaMap = new Map<string, { proCod: string; nome: string }>();
    try {
      const lineaRows = await this.prisma.$queryRawUnsafe<{ codice: string; codice_numerico: string; nome: string }[]>(
        `SELECT codice, codice_numerico, nome FROM integra_linee WHERE codice_numerico IS NOT NULL`,
      );
      for (const r of lineaRows) lineaMap.set(r.codice_numerico, { proCod: r.codice, nome: r.nome });
    } catch { /* fallback */ }

    // Cache integra_articoli: variante → linea_codice
    let cacheLineaMap = new Map<string, string>();
    try {
      const allArts = await this.prisma.$queryRawUnsafe<{ pro_cod: string; linea_codice: string }[]>(
        `SELECT pro_cod, linea_codice FROM integra_articoli WHERE linea_codice IS NOT NULL`,
      );
      for (const r of allArts) cacheLineaMap.set(r.pro_cod, r.linea_codice);
    } catch { /* cache non disponibile — salta */ }

    const grouped = await this.prisma.articolo.findMany({
      where: { varianti: { some: {} } },
      include: {
        varianti: { orderBy: { codice: 'asc' } },
        immagini: true,
        raccolte: true,
      },
    });
    for (const art of grouped) {
      try {
        const [first, ...rest] = art.varianti;
        const oldLineaCodice = cacheLineaMap.get(first.codice);
        const lineaEntry = oldLineaCodice ? lineaMap.get(oldLineaCodice) : undefined;
        const targetCodiceLinea = lineaEntry?.proCod || (art.varianti.length < 2 ? first.codice : first.codice);
        if (!lineaEntry && art.varianti.length < 2 && art.codiceLinea === first.codice) continue;

        await this.prisma.$transaction(async (tx) => {
          if (lineaEntry && art.codiceLinea !== lineaEntry.proCod) {
            await tx.articolo.update({ where: { id: art.id }, data: { codiceLinea: lineaEntry.proCod } });
          } else if (!lineaEntry && art.codiceLinea !== first.codice) {
            await tx.articolo.update({ where: { id: art.id }, data: { codiceLinea: first.codice } });
          }
          for (const v of rest) {
            await tx.variante.update({ where: { codice: v.codice }, data: { articoloId: art.id } });
          }
        });
        if (lineaEntry) splittati.push({ vecchioCodiceLinea: art.codiceLinea, nuovoCodiceLinea: lineaEntry.proCod });
      } catch (e: any) {
        errori.push({ articolo: art.codiceLinea, errore: e?.message ?? String(e) });
      }
    }
    return { famiglieCorrette: fixed.length, articoliSplittati: splittati.length, errori };
  }

  /** Filtri sidebar catalogo (famiglie/raccolte con conteggi) — query leggera. */
  async getCatalogoFacets(codiceListino: string = 'LIS1') {
    const arts = await this.prisma.articolo.findMany({
      where: { configurato: true, stato: 'ATTIVO', famiglia: { stato: 'ATTIVO' } },
      select: {
        famigliaCodice: true,
        famiglia: { select: { nome: true, nomePortale: true } },
        raccolte: { select: { raccolta: { select: { nome: true, slug: true, stato: true } } } },
      },
    });
    const famiglie = new Map<string, { codice: string; nome: string; count: number }>();
    const raccolte = new Map<string, { slug: string; nome: string; count: number }>();
    for (const a of arts) {
      const f = famiglie.get(a.famigliaCodice) ?? { codice: a.famigliaCodice, nome: a.famiglia.nomePortale || a.famiglia.nome, count: 0 };
      f.count++;
      famiglie.set(a.famigliaCodice, f);
      for (const r of a.raccolte) {
        if (r.raccolta.stato !== 'ATTIVO') continue;
        const x = raccolte.get(r.raccolta.slug) ?? { slug: r.raccolta.slug, nome: r.raccolta.nome, count: 0 };
        x.count++;
        raccolte.set(r.raccolta.slug, x);
      }
    }

    // Colori: aggregation diretta sugli articoli attivi
    const coloriRows = await this.prisma.$queryRawUnsafe<Array<{ colore: string; rgb: string | null; cnt: bigint }>>(
      `SELECT colore, colore_rgb AS rgb, count(*)::int AS cnt
       FROM articoli
       WHERE configurato = true AND stato = 'ATTIVO' AND colore IS NOT NULL AND colore <> ''
       GROUP BY colore, colore_rgb ORDER BY cnt DESC`,
    );
    const colori = coloriRows.map((r) => ({ nome: r.colore, rgb: r.rgb, count: Number(r.cnt) }));

    // Dimensioni: min/max da varianti.dimensioni JSONB (solo articoli attivi)
    const dimRows = await this.prisma.$queryRawUnsafe<Array<{ dim: string; min_val: number | null; max_val: number | null }>>(
      `SELECT d.dim,
              min((v.dimensioni->d.dim->>'valore')::numeric) AS min_val,
              max((v.dimensioni->d.dim->>'valore')::numeric) AS max_val
       FROM varianti v
       JOIN articoli a ON a.id = v.articolo_id
       CROSS JOIN (SELECT 'diametro' AS dim UNION ALL SELECT 'altezza' AS dim) d
       WHERE a.configurato = true AND a.stato = 'ATTIVO'
         AND v.dimensioni IS NOT NULL
         AND v.dimensioni ? d.dim
         AND (v.dimensioni->d.dim->>'valore') IS NOT NULL
         AND (v.dimensioni->d.dim->>'valore') <> ''
       GROUP BY d.dim`,
    );
    const dimensioni: Record<string, { min: number; max: number }> = {};
    for (const r of dimRows) {
      if (r.min_val != null && r.max_val != null) {
        dimensioni[r.dim] = { min: Number(r.min_val), max: Number(r.max_val) };
      }
    }

    // Prezzo: min/max prezzo netto dal listino (solo articoli del portale con varianti)
    const prezzoRows = await this.prisma.$queryRaw<Array<{ min_prezzo: number | null; max_prezzo: number | null }>>(
      Prisma.sql`SELECT min((plr.prezzo_listino * (1 - coalesce(plr.sconto_1,0)/100) * (1 - coalesce(plr.sconto_2,0)/100)
                    * (1 - coalesce(plr.sconto_3,0)/100) * (1 - coalesce(plr.sconto_4,0)/100)))::numeric AS min_prezzo,
              max((plr.prezzo_listino * (1 - coalesce(plr.sconto_1,0)/100) * (1 - coalesce(plr.sconto_2,0)/100)
                    * (1 - coalesce(plr.sconto_3,0)/100) * (1 - coalesce(plr.sconto_4,0)/100)))::numeric AS max_prezzo
       FROM varianti v
       JOIN articoli a ON a.id = v.articolo_id
       JOIN integra_listini_righe plr ON plr.codice_prodotto = v.codice
       WHERE a.configurato = true AND a.stato = 'ATTIVO'
         AND plr.codice_listino = ${codiceListino} AND plr.prezzo_listino > 0`,
    );
    const prezzo = prezzoRows[0]?.min_prezzo != null && prezzoRows[0]?.max_prezzo != null
      ? { min: Math.floor(Number(prezzoRows[0].min_prezzo)), max: Math.ceil(Number(prezzoRows[0].max_prezzo)) }
      : null;

    return { famiglie: [...famiglie.values()], raccolte: [...raccolte.values()], colori, dimensioni, prezzo };
  }

  /** Catalogo paginato lato cliente: filtri famiglia/raccolta/tab, ricerca testo, sort. */
  async getCatalogoPaginato(params: {
    page?: number; pageSize?: number;
    famiglia?: string[]; raccolte?: string[]; tab?: string; q?: string; sort?: string;
    colore?: string[];
    diametroMin?: number; diametroMax?: number;
    altezzaMin?: number; altezzaMax?: number;
    prezzoMin?: number; prezzoMax?: number;
    coloreRgb?: string; coloreTolleranza?: number;
    codiceListino?: string;
    codiceLinea?: string[];
  }) {
    const page = Math.max(1, params.page ?? 1);
    // I box passano fino a 24 codici: se filtriamo per codiceLinea serviamo tutto in una pagina.
    const pageSize = params.codiceLinea?.length
      ? Math.min(Math.max(params.codiceLinea.length, 1), 60)
      : Math.min(Math.max(params.pageSize ?? 24, 1), 60);

    const and: Prisma.ArticoloWhereInput[] = [
      { configurato: true, stato: 'ATTIVO', famiglia: { stato: 'ATTIVO' } },
    ];
    if (params.codiceLinea?.length) and.push({ codiceLinea: { in: params.codiceLinea } });
    if (params.famiglia?.length) and.push({ famigliaCodice: { in: params.famiglia } });
    if (params.tab) and.push({ raccolte: { some: { raccolta: { slug: params.tab, stato: 'ATTIVO' } } } });
    if (params.raccolte?.length) and.push({ raccolte: { some: { raccolta: { slug: { in: params.raccolte }, stato: 'ATTIVO' } } } });
    if (params.colore?.length) and.push({ colore: { in: params.colore } });
    if (params.q?.trim()) {
      const q = params.q.trim();
      and.push({ OR: [
        { nome: { contains: q, mode: 'insensitive' } },
        { codiceLinea: { contains: q, mode: 'insensitive' } },
        { varianti: { some: { codice: { contains: q, mode: 'insensitive' } } } },
        { famiglia: { is: { OR: [{ nome: { contains: q, mode: 'insensitive' } }, { nomePortale: { contains: q, mode: 'insensitive' } }] } } },
        { raccolte: { some: { raccolta: { nome: { contains: q, mode: 'insensitive' } } } } },
      ] });
    }

    // Se ci sono filtri dimensioni, prezzo, coloreRgb o sort custom, usiamo una raw query unica
    const hasRawFilters = (params.diametroMin != null || params.diametroMax != null || params.altezzaMin != null || params.altezzaMax != null || params.prezzoMin != null || params.prezzoMax != null || (params.coloreRgb && params.coloreTolleranza != null) || (params.sort && params.sort !== 'novita'));

    if (hasRawFilters) {
      // Costruiamo WHERE Prisma, poi lo serializziamo in SQL con il dialetto Prisma
      const baseWhere = Prisma.sql`WHERE a."configurato" = true AND a."stato" = 'ATTIVO' AND f."stato" = 'ATTIVO'`;

      let clCond = Prisma.sql``;
      if (params.codiceLinea?.length) {
        const clIn = Prisma.join(params.codiceLinea.map((c) => Prisma.sql`${c}`), ', ');
        clCond = Prisma.sql`AND a."codice_linea" IN (${clIn})`;
      }

      let famCond = Prisma.sql``;
      if (params.famiglia?.length) {
        const famIn = Prisma.join(params.famiglia.map((f) => Prisma.sql`${f}`), ', ');
        famCond = Prisma.sql`AND a."famiglia_codice" IN (${famIn})`;
      }

      let racCond = Prisma.sql``;
      if (params.tab) {
        racCond = Prisma.sql`AND EXISTS (SELECT 1 FROM "articoli_raccolte" ar JOIN "raccolte" r ON r.id = ar.raccolta_id WHERE ar.articolo_id = a.id AND r.slug = ${params.tab} AND r."stato" = 'ATTIVO')`;
      } else if (params.raccolte?.length) {
        const racIn = Prisma.join(params.raccolte.map((r) => Prisma.sql`${r}`), ', ');
        racCond = Prisma.sql`AND EXISTS (SELECT 1 FROM "articoli_raccolte" ar JOIN "raccolte" r ON r.id = ar.raccolta_id WHERE ar.articolo_id = a.id AND r.slug IN (${racIn}) AND r."stato" = 'ATTIVO')`;
      }

      let coloreCond = Prisma.sql``;
      if (params.colore?.length) {
        const colIn = Prisma.join(params.colore.map((c) => Prisma.sql`${c}`), ', ');
        coloreCond = Prisma.sql`AND a."colore" IN (${colIn})`;
      }

      let coloreRgbCond = Prisma.sql``;
      if (params.coloreRgb && params.coloreTolleranza != null) {
        const selLab = hexToLab(params.coloreRgb);
        // CIELAB distance: convert DB hex color to Lab inline, then compute ΔE
        coloreRgbCond = Prisma.sql`AND a."colore_rgb" IS NOT NULL AND a."colore_rgb" ~ '^#[0-9A-Fa-f]{6}$' AND (
          SELECT sqrt(
            power(116 * fxyz.fy - 16.0 - ${selLab.L}, 2) +
            power(500.0 * (fxyz.fx - fxyz.fy) - ${selLab.a}, 2) +
            power(200.0 * (fxyz.fy - fxyz.fz) - ${selLab.b}, 2)
          )
          FROM (
            SELECT
              CASE WHEN xyz.x / 0.95047 > ${LAB_EPSILON} THEN (xyz.x / 0.95047) ^ (1.0/3.0) ELSE (7.787 * xyz.x / 0.95047) + 16.0/116.0 END AS fx,
              CASE WHEN xyz.y > ${LAB_EPSILON} THEN xyz.y ^ (1.0/3.0) ELSE (7.787 * xyz.y) + 16.0/116.0 END AS fy,
              CASE WHEN xyz.z / 1.08883 > ${LAB_EPSILON} THEN (xyz.z / 1.08883) ^ (1.0/3.0) ELSE (7.787 * xyz.z / 1.08883) + 16.0/116.0 END AS fz
            FROM (
              SELECT
                0.4124564 * lin.rl + 0.3575761 * lin.gl + 0.1804375 * lin.bl AS x,
                0.2126729 * lin.rl + 0.7151522 * lin.gl + 0.0721750 * lin.bl AS y,
                0.0193339 * lin.rl + 0.1191920 * lin.gl + 0.9503041 * lin.bl AS z
              FROM (
                SELECT
                  CASE WHEN srgb.r <= 0.04045 THEN srgb.r / 12.92 ELSE ((srgb.r + 0.055) / 1.055) ^ 2.4 END AS rl,
                  CASE WHEN srgb.g <= 0.04045 THEN srgb.g / 12.92 ELSE ((srgb.g + 0.055) / 1.055) ^ 2.4 END AS gl,
                  CASE WHEN srgb.b <= 0.04045 THEN srgb.b / 12.92 ELSE ((srgb.b + 0.055) / 1.055) ^ 2.4 END AS bl
                FROM (
                  SELECT
                    get_byte(decode(substr(a."colore_rgb", 2, 2), 'hex'), 0) / 255.0 AS r,
                    get_byte(decode(substr(a."colore_rgb", 4, 2), 'hex'), 0) / 255.0 AS g,
                    get_byte(decode(substr(a."colore_rgb", 6, 2), 'hex'), 0) / 255.0 AS b
                ) srgb
              ) lin
            ) xyz
          ) fxyz
        ) <= ${params.coloreTolleranza}`;
      }

      let qCond = Prisma.sql``;
      if (params.q?.trim()) {
        const q = params.q.trim();
        qCond = Prisma.sql`AND (a."nome" ILIKE ${'%' + q + '%'} OR a."codice_linea" ILIKE ${'%' + q + '%'} OR EXISTS (SELECT 1 FROM varianti v WHERE v.articolo_id = a.id AND v.codice ILIKE ${'%' + q + '%'}) OR f."nome" ILIKE ${'%' + q + '%'} OR COALESCE(f."nome_portale", '') ILIKE ${'%' + q + '%'})`;
      }

      // Un singolo EXISTS che verifica dimensioni + prezzo sulla STESSA variante
      const variantSubConds: Prisma.Sql[] = [];
      variantSubConds.push(Prisma.sql`v.articolo_id = a.id`);
      variantSubConds.push(Prisma.sql`v.dimensioni IS NOT NULL`);
      if (params.diametroMin != null) variantSubConds.push(Prisma.sql`v.dimensioni->'diametro' IS NOT NULL AND (v.dimensioni->'diametro'->>'valore')::numeric >= ${params.diametroMin}`);
      if (params.diametroMax != null) variantSubConds.push(Prisma.sql`v.dimensioni->'diametro' IS NOT NULL AND (v.dimensioni->'diametro'->>'valore')::numeric <= ${params.diametroMax}`);
      if (params.altezzaMin != null) variantSubConds.push(Prisma.sql`v.dimensioni->'altezza' IS NOT NULL AND (v.dimensioni->'altezza'->>'valore')::numeric >= ${params.altezzaMin}`);
      if (params.altezzaMax != null) variantSubConds.push(Prisma.sql`v.dimensioni->'altezza' IS NOT NULL AND (v.dimensioni->'altezza'->>'valore')::numeric <= ${params.altezzaMax}`);

      const needPrezzo = params.prezzoMin != null || params.prezzoMax != null;
      let variantExistsSql: Prisma.Sql;
      if (needPrezzo) {
        const priceExpr = Prisma.sql`(plr.prezzo_listino * (1-coalesce(plr.sconto_1,0)/100) * (1-coalesce(plr.sconto_2,0)/100) * (1-coalesce(plr.sconto_3,0)/100) * (1-coalesce(plr.sconto_4,0)/100))::numeric`;
        variantSubConds.push(Prisma.sql`plr.codice_listino = ${params.codiceListino ?? 'LIS1'} AND plr.prezzo_listino > 0`);
        if (params.prezzoMin != null) variantSubConds.push(Prisma.sql`${priceExpr} >= ${params.prezzoMin}`);
        if (params.prezzoMax != null) variantSubConds.push(Prisma.sql`${priceExpr} <= ${params.prezzoMax}`);
        const allVariantConds = Prisma.join(variantSubConds, ' AND ');
        variantExistsSql = Prisma.sql`AND EXISTS (SELECT 1 FROM varianti v JOIN integra_listini_righe plr ON plr.codice_prodotto = v.codice WHERE ${allVariantConds})`;
      } else {
        const allVariantConds = Prisma.join(variantSubConds, ' AND ');
        variantExistsSql = Prisma.sql`AND EXISTS (SELECT 1 FROM varianti v WHERE ${allVariantConds})`;
      }

      const allConds = Prisma.join([baseWhere, clCond, famCond, racCond, coloreCond, coloreRgbCond, qCond, variantExistsSql], ' ');

      const countSql = Prisma.sql`SELECT count(*)::int AS n FROM articoli a JOIN "famiglie" f ON f.codice = a."famiglia_codice" ${allConds}`;
      const orderSql = params.sort === 'prezzo-asc' || params.sort === 'prezzo-desc'
        ? Prisma.sql`ORDER BY (SELECT min(plr2.prezzo_listino * (1-coalesce(plr2.sconto_1,0)/100) * (1-coalesce(plr2.sconto_2,0)/100) * (1-coalesce(plr2.sconto_3,0)/100) * (1-coalesce(plr2.sconto_4,0)/100)) FROM varianti vp2 JOIN integra_listini_righe plr2 ON plr2.codice_prodotto = vp2.codice WHERE vp2.articolo_id = a.id AND plr2.codice_listino = ${params.codiceListino ?? 'LIS1'} AND plr2.prezzo_listino > 0) ${params.sort === 'prezzo-asc' ? Prisma.sql`ASC NULLS LAST` : Prisma.sql`DESC NULLS LAST`}`
        : params.sort === 'nome-asc' ? Prisma.sql`ORDER BY a."nome" ASC NULLS LAST`
        : params.sort === 'nome-desc' ? Prisma.sql`ORDER BY a."nome" DESC NULLS LAST`
        : Prisma.sql`ORDER BY a."created_at" DESC`;

      const offset = (page - 1) * pageSize;
      const dataSql = Prisma.sql`
        SELECT a.id FROM articoli a
        JOIN "famiglie" f ON f.codice = a."famiglia_codice"
        ${allConds} ${orderSql}
        LIMIT ${pageSize} OFFSET ${offset}`;

      const [countResult, idRows] = await Promise.all([
        this.prisma.$queryRaw<{ n: number }[]>(countSql),
        this.prisma.$queryRaw<{ id: number }[]>(dataSql),
      ]);

      const total = countResult[0]?.n ?? 0;
      const ids = idRows.map((r) => r.id);

      if (ids.length === 0) {
        return { articoli: [], total, hasMore: page * pageSize < total };
      }

      const arts = await this.prisma.articolo.findMany({
        where: { id: { in: ids } },
        include: {
          famiglia: true,
          immagini: { where: { inGalleria: true }, orderBy: [{ copertina: 'desc' }, { ordinamento: 'asc' }] },
          raccolte: { include: { raccolta: { select: { nome: true, slug: true, stato: true } } } },
          _count: { select: { varianti: { where: { stato: { not: 'NASCOSTO' } } } } },
        },
      });
      // Mantieni l'ordine della raw query
      const artMap = new Map(arts.map((a) => [a.id, a]));
      const ordered = ids.map((id) => artMap.get(id)).filter(Boolean) as typeof arts;

      const [prezzi, disponibilita] = await Promise.all([
        this.getPrezziMinimiArticoli(ids, params.codiceListino ?? 'LIS1'),
        this.getDisponibilitaArticoli(ids),
      ]);
      const articoli = ordered.map((a) => this.mapArticoloCard(a, prezzi, disponibilita));
      return {
        articoli: await this.prioritizeExactCode(articoli, params.q),
        total,
        hasMore: page * pageSize < total,
      };
    }

    // Nessun filtro raw: usa Prisma normale (più veloce)
    const where: Prisma.ArticoloWhereInput = { AND: and };

    const [total, arts] = await Promise.all([
      this.prisma.articolo.count({ where }),
      this.prisma.articolo.findMany({
        where,
        include: {
          famiglia: true,
          immagini: { where: { inGalleria: true }, orderBy: [{ copertina: 'desc' }, { ordinamento: 'asc' }] },
          raccolte: { include: { raccolta: { select: { nome: true, slug: true, stato: true } } } },
          _count: { select: { varianti: { where: { stato: { not: 'NASCOSTO' } } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const artIds = arts.map((a) => a.id);
    const [prezzi, disponibilita] = await Promise.all([
      this.getPrezziMinimiArticoli(artIds, params.codiceListino ?? 'LIS1'),
      this.getDisponibilitaArticoli(artIds),
    ]);
    const articoli = arts.map((a) => this.mapArticoloCard(a, prezzi, disponibilita));
    return {
      articoli: await this.prioritizeExactCode(articoli, params.q),
      total,
      hasMore: page * pageSize < total,
    };
  }

  /** Card famiglie lato cliente: solo ATTIVE con articoli visibili, ordinate per `ordine`. */
  async getFamiglieCliente() {
    const fams = await this.prisma.famiglia.findMany({
      where: { stato: 'ATTIVO' },
      orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
    });
    const counts = await this.prisma.articolo.groupBy({
      by: ['famigliaCodice'],
      where: { configurato: true, stato: 'ATTIVO' },
      _count: { _all: true },
    });
    const cmap = new Map(counts.map((c) => [c.famigliaCodice, c._count._all]));
    return fams
      .map((f) => ({
        codice: f.codice,
        nome: f.nomePortale || f.nome,
        immagine: f.immagine,
        immagineAI: f.immagineAI,
        descrizione: f.descrizione,
        count: cmap.get(f.codice) ?? 0,
      }))
      .filter((f) => f.count > 0);
  }

  /** Batch query: prezzo minimo netto per ogni articolo, dato un codice listino. */
  private async getPrezziMinimiArticoli(artIds: number[], codiceListino: string): Promise<Map<number, number | null>> {
    if (!artIds.length) return new Map();
    const priceExpr = `(plr.prezzo_listino * (1-coalesce(plr.sconto_1,0)/100) * (1-coalesce(plr.sconto_2,0)/100) * (1-coalesce(plr.sconto_3,0)/100) * (1-coalesce(plr.sconto_4,0)/100))::numeric`;
    const rows = await this.prisma.$queryRawUnsafe<Array<{ art_id: number; prezzo: number | null }>>(
      `SELECT v.articolo_id AS art_id, min(${priceExpr}) AS prezzo
       FROM varianti v
       JOIN integra_listini_righe plr ON plr.codice_prodotto = v.codice
       WHERE v.articolo_id = ANY($1::int[])
         AND plr.codice_listino = $2 AND plr.prezzo_listino > 0
       GROUP BY v.articolo_id`,
      artIds, codiceListino,
    );
    const map = new Map<number, number | null>();
    for (const r of rows) map.set(r.art_id, r.prezzo != null ? Number(r.prezzo) : null);
    return map;
  }

  /** Disponibilità aggregata dell'articolo sulle varianti attive (stessa vista del cliente).
   *  esaurito = nessuna variante in giacenza; scorte_limitate = almeno una sotto soglia. */
  private async getDisponibilitaArticoli(artIds: number[]): Promise<Map<number, 'disponibile' | 'scorte_limitate' | 'esaurito'>> {
    const map = new Map<number, 'disponibile' | 'scorte_limitate' | 'esaurito'>();
    if (!artIds.length) return map;
    const soglia = parseInt(process.env.STOCK_LOW_THRESHOLD || '10', 10);
    const rows = await this.prisma.$queryRawUnsafe<Array<{ art_id: number; in_stock: number; low: number }>>(
      `SELECT v.articolo_id AS art_id,
              count(*) FILTER (WHERE v.giacenza > 0)::int AS in_stock,
              count(*) FILTER (WHERE v.giacenza < $2)::int AS low
       FROM varianti v
       WHERE v.articolo_id = ANY($1::int[])
         AND v.stato <> 'NASCOSTO'
       GROUP BY v.articolo_id`,
      artIds, soglia,
    );
    for (const r of rows) {
      if (r.in_stock <= 0) map.set(r.art_id, 'esaurito');
      else if (r.low > 0) map.set(r.art_id, 'scorte_limitate');
      else map.set(r.art_id, 'disponibile');
    }
    return map;
  }

  /** Arricchisce articoli già caricati (include famiglia/immagini/raccolte/_count) con
   *  prezzo minimo e disponibilità, nel formato card del catalogo. */
  private async enrichWithPrezzi(arts: any[], codiceListino?: string | null) {
    if (!arts.length) return [];
    const ids = arts.map((a) => a.id);
    const [prezzi, disponibilita] = await Promise.all([
      this.getPrezziMinimiArticoli(ids, codiceListino ?? 'LIS1'),
      this.getDisponibilitaArticoli(ids),
    ]);
    return arts.map((a) => this.mapArticoloCard(a, prezzi, disponibilita));
  }

  /** Card (prezzo + disponibilità) per gli articoli dati — usata dai box dashboard. */
  async arricchisciBoxArticoli(artIds: number[], codiceListino?: string | null) {
    if (!artIds.length) return [];
    const arts = await this.prisma.articolo.findMany({
      where: { id: { in: artIds } },
      include: this.cardInclude,
    });
    return this.enrichWithPrezzi(arts, codiceListino ?? null);
  }

  /** Range diametro/altezza (min-max sulle varianti) per ogni articolo. */
  private async getDimensioniArticoli(artIds: number[]): Promise<Map<number, { diametro?: [number, number]; altezza?: [number, number] } | null>> {
    const map = new Map<number, { diametro?: [number, number]; altezza?: [number, number] }>();
    if (!artIds.length) return map;
    const rows = await this.prisma.$queryRawUnsafe<Array<{ art_id: number; dim: string; min_val: number; max_val: number }>>(
      `SELECT v.articolo_id AS art_id, d.dim,
              min((v.dimensioni->d.dim->>'valore')::numeric) AS min_val,
              max((v.dimensioni->d.dim->>'valore')::numeric) AS max_val
       FROM varianti v
       CROSS JOIN (SELECT 'diametro' AS dim UNION ALL SELECT 'altezza' AS dim) d
       WHERE v.articolo_id = ANY($1::int[])
         AND v.dimensioni IS NOT NULL
         AND v.dimensioni ? d.dim
         AND (v.dimensioni->d.dim->>'valore') IS NOT NULL
         AND (v.dimensioni->d.dim->>'valore') <> ''
       GROUP BY v.articolo_id, d.dim`,
      artIds,
    );
    for (const r of rows) {
      const cur = map.get(r.art_id) ?? {};
      if (r.dim === 'diametro' || r.dim === 'altezza') cur[r.dim] = [Number(r.min_val), Number(r.max_val)];
      map.set(r.art_id, cur);
    }
    return map;
  }

  /** Card catalogo da un articolo con include { famiglia, immagini, raccolte, _count }. */
  private mapArticoloCard(a: any, prezziPerArticolo?: Map<number, number | null>, disponibilitaPerArticolo?: Map<number, 'disponibile' | 'scorte_limitate' | 'esaurito'>) {
    const cover = a.immagini.find((i: any) => i.copertina) ?? a.immagini[0];
    let prezzoMin: number | null = null;
    if (prezziPerArticolo) {
      prezzoMin = prezziPerArticolo.get(a.id) ?? null;
    }
    return {
      id: a.codiceLinea,
      nome: a.nome,
      colore: a.colore || null,
      coloreRgb: a.coloreRgb || null,
      famiglia: { codice: a.famigliaCodice, nome: a.famiglia.nomePortale || a.famiglia.nome },
      raccolte: a.raccolte
        .filter((r: any) => r.raccolta.stato === 'ATTIVO')
        .map((r: any) => ({ nome: r.raccolta.nome, slug: r.raccolta.slug })),
      img: cover?.url ?? null,
      imgCss: cover?.css ?? null,
      imgTipo: cover?.tipo ?? null,
      variantiCount: a._count.varianti,
      prezzo: prezzoMin,
      disponibilita: disponibilitaPerArticolo?.get(a.id) ?? 'esaurito',
      createdAt: a.createdAt,
    };
  }

  /** Include comune delle card (famiglia, immagini galleria, raccolte attive, conteggio varianti). */
  private readonly cardInclude: Prisma.ArticoloInclude = {
    famiglia: true,
    immagini: { where: { inGalleria: true }, orderBy: [{ copertina: 'desc' }, { ordinamento: 'asc' }] },
    raccolte: { include: { raccolta: { select: { nome: true, slug: true, stato: true } } } },
    _count: { select: { varianti: { where: { stato: { not: 'NASCOSTO' } } } } },
  };

  /** Articolo visibile al cliente con codiceLinea == `code`, oppure l'articolo della
   *  variante (attiva) con codice == `code`. Null se nessuno dei due è visibile. */
  private async resolveCodiceArticolo(code: string) {
    const visibile = (a: any) => a && a.stato === 'ATTIVO' && a.configurato && a.famiglia?.stato === 'ATTIVO';
    const art = await this.prisma.articolo.findUnique({ where: { codiceLinea: code }, include: this.cardInclude });
    if (visibile(art)) return art;
    const viaVar = await this.prisma.variante.findFirst({
      where: { codice: code, stato: { not: 'NASCOSTO' } },
      select: { articoloId: true },
    });
    if (!viaVar) return null;
    const art2 = await this.prisma.articolo.findUnique({ where: { id: viaVar.articoloId }, include: this.cardInclude });
    return visibile(art2) ? art2 : null;
  }

  /** In una lista di card, porta in testa l'articolo con codice esatto uguale a `q`
   *  (codice articolo o codice variante, es. LU3258). */
  private async prioritizeExactCode<T extends { id: string }>(list: T[], q?: string): Promise<T[]> {
    const query = q?.trim();
    if (!query || !/^[A-Z]{2,}[0-9]{3,}$/i.test(query)) return list;
    let target = query.toUpperCase();
    if (!list.some((x) => x.id.toUpperCase() === target)) {
      const viaVar = await this.prisma.variante.findFirst({
        where: { codice: target, stato: { not: 'NASCOSTO' } },
        select: { articolo: { select: { codiceLinea: true } } },
      });
      if (viaVar?.articolo) target = viaVar.articolo.codiceLinea;
    }
    const exact = list.find((x) => x.id.toUpperCase() === target);
    if (!exact) return list;
    return [exact, ...list.filter((x) => x !== exact)];
  }

  // ── Ricerca semantica (pgvector + embedding testuale) ─────────────────────

  /** Blob testo indicizzato per un articolo (deve combaciare col backfill).
   *  Include le varianti attive (descrizione + dimensioni) perché il cliente le vede:
   *  così aggiungere/modificare varianti cambia l'hash e rigenera l'embedding. */
  private buildEmbeddingBlob(a: {
    nome: string; colore?: string | null; descrizioneAI?: string | null;
    descrizione?: string | null; descrizioneDettagliata?: string | null;
    famiglia?: { nome: string; nomePortale?: string | null } | null;
    varianti?: { descrizione: string; dimensioni?: unknown; multiplo?: number }[];
  }): string {
    const fam = a.famiglia?.nomePortale || a.famiglia?.nome || '';
    const parts = [a.nome, fam, a.colore, a.descrizioneAI, a.descrizione, a.descrizioneDettagliata];
    if (a.varianti?.length) {
      const variantiTxt = a.varianti
        .map((v) => [v.descrizione, this.dimText(v.dimensioni), this.dimFormaText(v.dimensioni)].filter(Boolean).join(' '))
        .join('; ');
      if (variantiTxt) parts.push(`Varianti: ${variantiTxt}`);
    }
    return parts.filter((s) => s && String(s).trim()).join('\n');
  }

  /** Dimensioni JSON variante (es. {diametro:{valore:30,unita:'cm'}}) → testo "Ø30 cm H40 cm". */
  private dimText(dim: unknown): string {
    if (!dim || typeof dim !== 'object') return '';
    const parts: string[] = [];
    for (const [k, v] of Object.entries(dim as Record<string, any>)) {
      const val = v?.valore != null ? String(v.valore) : '';
      const unita = v?.unita ? String(v.unita) : '';
      const label = k === 'diametro' ? 'Ø' : k === 'altezza' ? 'H' : `${k} `;
      const s = `${label}${val}${unita}`.trim();
      if (s) parts.push(s);
    }
    return parts.join(' ');
  }

  /** Forma derivata dal rapporto dimensioni della variante, in linguaggio naturale.
   *  Serve alla ricerca semantica: "basso e largo" / "alto e stretto" non stanno
   *  nelle misure grezze ma nel RAPPORTO Ø/H. Ritorna stringa (o ''). */
  private dimFormaText(dim: unknown): string {
    if (!dim || typeof dim !== 'object') return '';
    const get = (k: string): number | null => {
      const v = (dim as Record<string, any>)[k]?.valore;
      const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    const d = get('diametro') ?? get('larghezza') ?? get('lato');
    const h = get('altezza');
    if (d == null || h == null) return '';
    const r = d / h;
    if (r >= 1.1) return 'forma bassa e larga, più largo che alto, basso e largo';
    if (r <= 0.8) return 'forma slanciata, alto e stretto, più alto che largo';
    return 'forma equilibrata, proporzionata, né basso né alto';
  }

  /** (Ri)genera l'embedding di un articolo se il blob e' cambiato. Fire-and-forget. */
  async reembedArticolo(codiceLinea: string): Promise<void> {
    const a = await this.prisma.articolo.findUnique({
      where: { codiceLinea },
      include: { famiglia: true, varianti: { where: { stato: { not: 'NASCOSTO' } }, orderBy: { codice: 'asc' } } },
    });
    // Indicizziamo solo cio' che il cliente puo' vedere.
    if (!a || !a.configurato || a.stato !== 'ATTIVO' || a.famiglia.stato !== 'ATTIVO') {
      await this.prisma.$executeRawUnsafe('DELETE FROM articolo_embedding WHERE articolo_id = $1', a?.id ?? -1);
      return;
    }
    const blob = this.buildEmbeddingBlob(a);
    const hash = createHash('sha256').update(`${this.embedding.dim}:${blob}`).digest('hex');
    const existing = await this.prisma.$queryRawUnsafe<{ fonte_hash: string }[]>(
      'SELECT fonte_hash FROM articolo_embedding WHERE articolo_id = $1', a.id,
    );
    if (existing[0]?.fonte_hash === hash) return; // invariato
    const vec = await this.embedding.embedText(blob);
    if (!vec) return; // provider non disponibile: riprovera' al prossimo salvataggio/backfill
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO articolo_embedding (articolo_id, text_vec, fonte_hash, updated_at)
       VALUES ($1, $2::double precision[], $3, now())
       ON CONFLICT (articolo_id) DO UPDATE
         SET text_vec = EXCLUDED.text_vec, fonte_hash = EXCLUDED.fonte_hash, updated_at = now()`,
      a.id, this.embedding.toArrayLiteral(vec), hash,
    );
  }

  /**
   * Riscrive la query del cliente in parole chiave normalizzate per il dominio
   * (vasi/complementi) ed estrae il colore, così da poterlo prioritizzare.
   * Se il rewrite è spento o fallisce, ritorna la query grezza.
   */
  private async rewriteQuery(q: string): Promise<{ attributi: string[]; keywords: string }> {
    const prompt = `Sei un assistente di ricerca per un catalogo B2B di vasi, fioriere, cache-pot e complementi d'arredo (materiali tipici: cotto, terracotta, fiberstone, ceramica, metallo; uso interno/esterno). Trasforma la richiesta del cliente per una ricerca semantica nel catalogo.

Distingui due tipi di informazione:
- ATTRIBUTI OGGETTIVI (misurabili/verificabili): colore, materiale, forma, dimensione/formato, uso (interno/esterno), tipo di prodotto. Sono prioritari.
- Descrizioni soggettive o generiche: NON sono attributi.

Regole:
- Normalizza ogni attributo al termine merceologico più vicino (es. "marrone chiaro" -> "nocciola"; "grigio scuro" -> "antracite"; "tondo" -> "rotondo").
- "attributi": elenco degli attributi oggettivi presenti, ognuno una parola/termine breve, ordinati per rilevanza (prima colore/materiale, poi forma/dimensione/uso).
- "keywords": stringa di parole chiave normalizzate ordinate per rilevanza (attributi oggettivi in testa), per l'embedding.
- Correggi refusi, espandi sigle ovvie, rimuovi parole inutili ("cerco", "vorrei", "un").
- NON inventare attributi non presenti nella richiesta. Se non ce ne sono, "attributi": [].

Rispondi SOLO con JSON valido, senza testo attorno:
{"attributi": ["..."], "keywords": "..."}

Richiesta del cliente: "${q}"`;
    try {
      const raw = await this.callGeminiText(prompt, undefined, 'rewrite');
      const m = raw.match(/\{[\s\S]*\}/);
      const obj = JSON.parse(m ? m[0] : raw) as { attributi?: unknown; keywords?: unknown };
      const keywords = (obj.keywords ? String(obj.keywords) : '').trim() || q;
      const attributi = Array.isArray(obj.attributi)
        ? obj.attributi.map((a) => String(a).trim().toLowerCase()).filter((a) => a && a !== 'null')
        : [];
      return { attributi, keywords };
    } catch {
      return { attributi: [], keywords: q };
    }
  }

  /** Rileva dalla query (attributi del rewrite + keywords grezze) se l'utente
   *  cerca una forma dimensionale e in che direzione (largo vs alto).
   *  Ritorna { versaLargo, boost } o null se nessun termine di forma è presente. */
  private formaDaAttributi(attributi: string[], keywords: string): { versaLargo: boolean; boost: number } | null {
    const terminiLarghi = ['basso', 'bassa', 'larg', 'svasat', 'tond', 'ampio', 'ampia', 'robust', 'tozzo', 'tozza', 'rastremat'];
    const terminiAlti = ['alto', 'alta', 'strett', 'slanciat', 'snell', 'affusolat', 'sottil', 'tir', 'elevat'];
    const haystack = `${attributi.join(' ')} ${keywords}`.toLowerCase();
    const boost = parseFloat(process.env.SEARCH_FORM_BOOST || '0.15');
    const versaLargo = terminiLarghi.some((t) => haystack.includes(t));
    const versoAlto = terminiAlti.some((t) => haystack.includes(t));
    if (versaLargo && !versoAlto) return { versaLargo: true, boost };
    if (versoAlto && !versaLargo) return { versaLargo: false, boost };
    return null; // assente o ambigua
  }

  /** Ricerca semantica testuale: riscrive la query e ordina il catalogo.
   *  Prima tenta match esatti per codici articolo (LU3161) o famiglie (linea ROGERS). */
  async searchSemantica(q: string, k = 24, codiceListino?: string | null) {
    const query = (q || '').trim();
    if (!query) return { articoli: [], provider: this.embedding.provider };

    // 1) Match esatto codice articolo o variante (es. LU3161, LU3258)
    const codeMatch = query.match(/^[A-Z]{2,}[0-9]{3,}$/i);
    if (codeMatch) {
      const exact = await this.resolveCodiceArticolo(codeMatch[0].toUpperCase());
      if (exact) {
        const arts = await this.enrichWithPrezzi([exact], codiceListino);
        return { articoli: arts, provider: 'exact-code' };
      }
    }

    // 2) Match "linea XXX" / "famiglia XXX" / "fammi vedere la linea XXX"
    const familyMatch = query.match(/(?:linea|famiglia|fammi vedere la linea)\s+([A-Z0-9_\-]+)/i);
    if (familyMatch) {
      const famCode = familyMatch[1].toUpperCase();
      const fam = await this.prisma.famiglia.findUnique({ where: { codice: famCode } });
      if (fam && fam.stato === 'ATTIVO') {
        const arts = await this.prisma.articolo.findMany({
          where: { famigliaCodice: famCode, configurato: true, stato: 'ATTIVO' },
          include: this.cardInclude,
        });
        const enriched = await this.enrichWithPrezzi(arts, codiceListino);
        return { articoli: enriched, provider: 'exact-family' };
      }
    }

    // 3) Fallback: ricerca semantica normale
    const rewriteOn = (process.env.SEARCH_QUERY_REWRITE || 'on') !== 'off';
    const rw = rewriteOn ? await this.rewriteQuery(query) : { attributi: [] as string[], keywords: query };
    const res = await this.rankArticoli(rw.attributi, rw.keywords, k, codiceListino);
    void this.events.track('ricerca', { dettagli: { q: query, n: res.articoli.length } });
    return res;
  }

  /**
   * Core di ranking condiviso da ricerca testo e immagine:
   * embedda keywords (+ attributi in testa) e ordina per coseno + boost attributi.
   */
  private async rankArticoli(attributi: string[], keywords: string, k = 24, codiceListino?: string | null) {
    // Attributi in testa e ripetuti nel testo embeddato per dargli peso semantico.
    const toEmbed = attributi.length ? `${attributi.join(' ')} ${attributi.join(' ')} ${keywords}` : keywords;
    const attrBoost = parseFloat(process.env.SEARCH_ATTR_BOOST || '0.10');
    const boostCap = parseFloat(process.env.SEARCH_BOOST_CAP || '0.30');

    const vec = await this.embedding.embedText(toEmbed);
    if (!vec) return { articoli: [], provider: this.embedding.provider, error: 'embeddings_non_disponibili' };

    // Solo articoli visibili al cliente; coseno + boost attributi calcolati in Node.
    // objtext = dati oggettivi dell'articolo: nome, colore, materiale/linea (famiglia),
    // descrizione AI (contiene forma/dimensioni/colore a parole) + misure delle varianti.
    // forma_ratio = rapporto Ø/H medio delle varianti (per il boost dimensionale).
    const rows = await this.prisma.$queryRawUnsafe<
      { codice_linea: string; objtext: string; forma_ratio: number | null; text_vec: number[] | null }[]
    >(
      `SELECT a.codice_linea,
              lower(
                coalesce(a.nome,'') || ' ' || coalesce(a.colore,'') || ' ' ||
                coalesce(f.nome_portale, f.nome, '') || ' ' ||
                coalesce(a.descrizione_ai,'') || ' ' || coalesce(a.descrizione,'') || ' ' ||
                coalesce((SELECT string_agg(v.dimensioni::text, ' ') FROM varianti v WHERE v.articolo_id = a.id AND v.stato <> 'NASCOSTO'), '')
              ) AS objtext,
              (
                SELECT avg(
                  CASE
                    WHEN (v.dimensioni->>'diametro') IS NOT NULL AND (v.dimensioni->>'altezza') IS NOT NULL
                      AND (v.dimensioni->'diametro'->>'valore') ~ '^[0-9]+([.,][0-9]+)?$'
                      AND (v.dimensioni->'altezza'->>'valore') ~ '^[0-9]+([.,][0-9]+)?$'
                    THEN (replace(v.dimensioni->'diametro'->>'valore', ',', '.'))::numeric
                         / NULLIF((replace(v.dimensioni->'altezza'->>'valore', ',', '.'))::numeric, 0)
                    ELSE NULL
                  END
                ) FROM varianti v WHERE v.articolo_id = a.id AND v.stato <> 'NASCOSTO'
              ) AS forma_ratio,
              e.text_vec
         FROM articolo_embedding e
         JOIN articoli a  ON a.id = e.articolo_id
         JOIN famiglie f  ON f.codice = a.famiglia_codice
        WHERE a.configurato = true AND a.stato = 'ATTIVO' AND f.stato = 'ATTIVO'`,
    );
    // Ogni attributo oggettivo presente nei dati dell'articolo dà un bonus (con tetto):
    // gli articoli che soddisfano più attributi richiesti salgono.
    const boostFor = (objtext: string) => {
      if (!attributi.length) return 0;
      const matched = attributi.filter((a) => objtext.includes(a)).length;
      return Math.min(matched * attrBoost, boostCap);
    };
    // Boost dimensionale: se la query chiede "basso/largo" preferisce Ø/H>=1.1,
    // "alto/stretto" Ø/H<=0.8. Si applica solo quando l'attributo è davvero di forma.
    const formaRequest = this.formaDaAttributi(attributi, keywords);
    const formaBoostFor = (ratio: number | null): number => {
      if (!formaRequest || ratio == null) return 0;
      const match = formaRequest.versaLargo ? ratio >= 1.1 : ratio <= 0.8;
      return match ? formaRequest.boost : 0;
    };
    const ranked = rows
      .filter((r) => r.text_vec?.length)
      .map((r) => ({
        codice: r.codice_linea,
        score:
          EmbeddingService.cosine(vec, r.text_vec as number[]) +
          boostFor(r.objtext || '') +
          formaBoostFor(r.forma_ratio),
      }))
      .sort((x, y) => y.score - x.score);

    // Taglio di pertinenza: gli embedding generici danno punteggi ravvicinati, quindi
    // senza cutoff la ricerca "ordina tutto" invece di filtrare. Tengo i risultati
    // vicini al migliore (margine relativo) sopra una soglia minima assoluta.
    // ponytail: manopole via env, da tarare sul catalogo reale.
    const margin = parseFloat(process.env.EMBEDDINGS_SCORE_MARGIN || '0.04');
    const floor = parseFloat(process.env.EMBEDDINGS_SCORE_MIN || '0.5');
    const best = ranked[0]?.score ?? 0;
    const top = ranked
      .filter((r) => r.score >= Math.max(floor, best - margin))
      .slice(0, Math.min(Math.max(k, 1), 60));
    if (!top.length) return { articoli: [], provider: this.embedding.provider };
    const scoreByCodice = new Map(top.map((r) => [r.codice, r.score]));
    const arts = await this.prisma.articolo.findMany({
      where: { codiceLinea: { in: top.map((r) => r.codice) } },
      include: {
        famiglia: true,
        immagini: { where: { inGalleria: true }, orderBy: [{ copertina: 'desc' }, { ordinamento: 'asc' }] },
        raccolte: { include: { raccolta: { select: { nome: true, slug: true, stato: true } } } },
        _count: { select: { varianti: { where: { stato: { not: 'NASCOSTO' } } } } },
      },
    });
    // Prezzo minimo (listino del cliente), range dimensioni e disponibilità per
    // articolo: servono ai filtri client-side applicati sopra i risultati.
    const [prezzi, dimensioni, disponibilita] = await Promise.all([
      this.getPrezziMinimiArticoli(arts.map((a) => a.id), codiceListino ?? 'LIS1'),
      this.getDimensioniArticoli(arts.map((a) => a.id)),
      this.getDisponibilitaArticoli(arts.map((a) => a.id)),
    ]);
    const articoli = arts
      .map((a) => ({
        ...this.mapArticoloCard(a, prezzi, disponibilita),
        dimensioni: dimensioni.get(a.id) ?? null,
        score: scoreByCodice.get(a.codiceLinea) ?? 0,
      }))
      .sort((x, y) => y.score - x.score); // findMany non preserva l'ordine dell'IN
    return { articoli, provider: this.embedding.provider, keywords, attributi };
  }

  /**
   * Estrae dagli attributi oggettivi da una foto del cliente (Gemini Vision) con
   * guardrail stretti: solo il prodotto/contenitore, niente invenzioni, vocabolari chiusi.
   */
  private async analyzeImage(b64: string, mime: string): Promise<{ pertinente: boolean; attributi: string[]; keywords: string }> {
    const prompt = `Analizza l'immagine per cercare un prodotto in un catalogo B2B di vasi, fioriere, cache-pot e complementi d'arredo.

GUARDRAIL (rispettali sempre):
- Descrivi SOLO il contenitore/prodotto. Ignora del tutto piante, fiori, terra, sfondo, arredo attorno, persone, mani.
- NON inventare: se un attributo non è determinabile con certezza dalla foto, mettilo a null. Meglio vuoto che sbagliato.
- NIENTE misure assolute in cm (non deducibili da una foto senza riferimenti): usa "dimensione_relativa" solo se evidente, altrimenti null.
- Usa SOLO questi vocabolari chiusi:
  - materiale: cotto | terracotta | fiberstone | ceramica | metallo | plastica | vetro | null
  - forma: rotondo | quadrato | rettangolare | conico | cilindrico | ovale | null
  - uso: interno | esterno | entrambi | null
  - dimensione_relativa: piccolo | medio | grande | null
- Se l'immagine NON contiene un prodotto pertinente (persona, animale, documento, screenshot, ecc.): "pertinente": false e tutti i campi null.
- "attributi": elenco dei VALORI degli attributi oggettivi presenti (es. ["vaso","ceramica","rotondo","interno"]), NON i nomi dei campi. Solo termini certi, in minuscolo.
- "keywords": stringa di parole chiave normalizzate ordinate per rilevanza, per l'embedding.

Rispondi SOLO con JSON valido, senza testo attorno:
{"pertinente": true, "tipo": "...|null", "colore": "...|null", "materiale": "...|null", "forma": "...|null", "finitura": "...|null", "dimensione_relativa": "...|null", "uso": "...|null", "attributi": ["..."], "keywords": "..."}`;
    try {
      const raw = await this.callGeminiText(prompt, { mime, b64 }, 'vision');
      const m = raw.match(/\{[\s\S]*\}/);
      const obj = JSON.parse(m ? m[0] : raw) as { pertinente?: unknown; attributi?: unknown; keywords?: unknown };
      const pertinente = obj.pertinente !== false;
      const attributi = Array.isArray(obj.attributi)
        ? obj.attributi.map((a) => String(a).trim().toLowerCase()).filter((a) => a && a !== 'null')
        : [];
      const keywords = (obj.keywords ? String(obj.keywords) : '').trim();
      return { pertinente, attributi, keywords };
    } catch {
      return { pertinente: true, attributi: [], keywords: '' };
    }
  }

  /** Ricerca per immagine: estrae attributi dalla foto e riusa il ranking testuale. */
  async searchByImage(buffer: Buffer, mime: string, k = 24, codiceListino?: string | null) {
    const a = await this.analyzeImage(buffer.toString('base64'), mime);
    if (!a.pertinente) return { articoli: [], provider: this.embedding.provider, error: 'immagine_non_pertinente' };
    if (!a.keywords && !a.attributi.length) {
      return { articoli: [], provider: this.embedding.provider, error: 'immagine_non_riconosciuta' };
    }
    const res = await this.rankArticoli(a.attributi, a.keywords || a.attributi.join(' '), k, codiceListino);
    void this.events.track('ricerca', { dettagli: { tipo: 'immagine', n: res.articoli.length } });
    return { ...res, keywords: a.keywords, attributi: a.attributi };
  }

  async getArticoli() {
    const rows = await this.prisma.articolo.findMany({
      include: {
        _count: { select: { varianti: true } },
        immagini: { where: { copertina: true }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
    // Calcola varianti visibili per ogni articolo
    const variantiVisibili = await this.prisma.$queryRawUnsafe<{ articolo_id: number; cnt: bigint }[]>(
      `SELECT "articolo_id", count(*) as cnt FROM "varianti" WHERE "stato" != 'NASCOSTO' GROUP BY "articolo_id"`
    );
    const visMap = new Map<number, number>();
    for (const v of variantiVisibili) visMap.set(Number(v.articolo_id), Number(v.cnt));

    return Promise.all(rows.map(async (a) => {
      const raccolte = await this.prisma.raccolta.findMany({
        where: { articoli: { some: { articoloId: a.id } } },
        select: { id: true, nome: true, slug: true, sconto: true },
      });
      return {
        articoloId: a.id,
        id: a.codiceLinea,
        name: a.nome,
        descrizione: a.descrizione || null,
        colore: a.colore || '',
        coloreRgb: a.coloreRgb || null,
        famigliaPrincipale: a.famigliaCodice,
        raccolte: raccolte.map((r) => r.nome),
        stato: (a.stato === 'NASCOSTO' ? 'nascosto' : 'attivo') as 'attivo' | 'nascosto',
        img: a.immagini[0]?.url ?? null,
        imgTipo: a.immagini[0]?.tipo ?? null,
        variantiCount: a._count.varianti,
        variantiVisibiliCount: visMap.get(a.id) ?? 0,
        configurato: a.configurato ?? false,
      };
    }));
  }

  async toggleArticoloStato(codiceLinea: string) {
    const art = await this.prisma.articolo.findUnique({ where: { codiceLinea } });
    if (!art) throw new NotFoundException('Articolo non trovato');
    const nuovoStato = art.stato === 'ATTIVO' ? 'NASCOSTO' : 'ATTIVO';
    if (nuovoStato === 'ATTIVO' && !art.configurato) {
      throw new BadRequestException('Articolo da configurare: non puo\' essere reso visibile.');
    }
    await this.prisma.articolo.update({
      where: { codiceLinea },
      data: { stato: nuovoStato },
    });
    return { stato: nuovoStato === 'ATTIVO' ? 'attivo' : 'nascosto' };
  }

  /**
   * Passaggio "da configurare" -> "configurato". IRREVERSIBILE.
   * Criteri: almeno una foto, un colore, almeno una variante.
   * ponytail: criterio "listino associato" da aggiungere quando esistera' il
   * modello listini (per ora non applicato - vedi task di tracking).
   */
  async configuraArticolo(codiceLinea: string) {
    const art = await this.prisma.articolo.findUnique({
      where: { codiceLinea },
      include: { _count: { select: { immagini: true, varianti: true } } },
    });
    if (!art) throw new NotFoundException('Articolo non trovato');
    if (art.configurato) return { configurato: true };
    const mancanti: string[] = [];
    if (art._count.immagini < 1) mancanti.push('almeno una foto');
    if (!art.colore || !art.colore.trim()) mancanti.push('un colore');
    if (art._count.varianti < 1) mancanti.push('almeno una variante');
    if (!art.descrizione || !art.descrizione.trim()) mancanti.push('una descrizione');
    if (mancanti.length) {
      throw new BadRequestException(`Impossibile configurare: manca ${mancanti.join(', ')}.`);
    }
    await this.prisma.articolo.update({ where: { codiceLinea }, data: { configurato: true } });
    void this.reembedArticolo(codiceLinea).catch(() => {});
    return { configurato: true };
  }

  async getArticolo(codiceLinea: string) {
    const art = await this.prisma.articolo.findUnique({
      where: { codiceLinea },
      include: {
        varianti: true,
        famiglia: true,
        immagini: { orderBy: { ordinamento: 'asc' } },
        raccolte: { include: { raccolta: { select: { id: true, nome: true, slug: true, sconto: true, stato: true } } } },
        _count: { select: { varianti: true } },
      },
    });
    if (!art) throw new NotFoundException('Articolo non trovato');
    return {
      id: art.codiceLinea,
      codiceLinea: art.codiceLinea,
      nome: art.nome,
      colore: art.colore,
      coloreRgb: art.coloreRgb || null,
      stato: art.stato === 'NASCOSTO' ? 'nascosto' : 'attivo',
      configurato: art.configurato,
      famiglia: { codice: art.famiglia.codice, nome: art.famiglia.nomePortale || art.famiglia.nome, stato: art.famiglia.stato },
      variantiCount: art._count.varianti,
      updatedAt: art.updatedAt,
      descrizione: art.descrizione ?? null,
      descrizioneDettagliata: art.descrizioneDettagliata ?? null,
      descrizioneAI: art.descrizioneAI ?? null,
      promptAi: art.promptAi ?? null,
      wizardStepTesti: art.wizardStepTesti,
      raccolte: art.raccolte.map((ar) => ({
        id: ar.raccolta.id,
        nome: ar.raccolta.nome,
        slug: ar.raccolta.slug,
        sconto: ar.raccolta.sconto,
        stato: ar.raccolta.stato,
      })),
      varianti: art.varianti.map((v) => ({
        codice: v.codice,
        descrizione: v.descrizione,
        dimensioni: v.dimensioni,
        multiplo: v.multiplo,
        giacenza: v.giacenza,
        stato: v.stato === 'NASCOSTO' ? 'nascosto' : 'attivo',
      })),
      immagini: art.immagini.map((i) => ({ id: i.id, url: i.url, ordinamento: i.ordinamento, copertina: i.copertina, tipo: i.tipo, inGalleria: i.inGalleria, css: i.css, prompt: i.prompt, aiModel: i.aiModel, aiAspect: i.aiAspect, aiTemperature: i.aiTemperature, aiSeed: i.aiSeed, immaginePadreId: i.immaginePadreId })),
    };
  }

  /** Articoli correlati: stessa famiglia, raccolte in comune, colore simile, dimensioni vicine. */
  async getCorrelati(codiceLinea: string, clienteId?: number) {
    const art = await this.prisma.articolo.findUnique({
      where: { codiceLinea },
      include: {
        famiglia: true,
        raccolte: { include: { raccolta: { select: { slug: true } } } },
        varianti: { select: { dimensioni: true } },
      },
    });
    if (!art) return [];

    const raccolteSlugs = new Set(art.raccolte.map((r) => r.raccolta.slug));

    // Dimensioni min/max della fonte
    let srcDimMin = Infinity, srcDimMax = -Infinity;
    for (const v of art.varianti) {
      if (!v.dimensioni) continue;
      for (const [k, val] of Object.entries(v.dimensioni as Record<string, any>)) {
        const n = Number(val?.valore);
        if (!isNaN(n)) { srcDimMin = Math.min(srcDimMin, n); srcDimMax = Math.max(srcDimMax, n); }
      }
    }

    // Tutti gli articoli attivi della stessa famiglia
    const candidates = await this.prisma.articolo.findMany({
      where: {
        famigliaCodice: art.famigliaCodice,
        codiceLinea: { not: codiceLinea },
        configurato: true,
        stato: 'ATTIVO',
      },
      include: {
        famiglia: { select: { nome: true, nomePortale: true } },
        immagini: { where: { copertina: true }, take: 1 },
        raccolte: { include: { raccolta: { select: { nome: true, slug: true } } } },
        varianti: { select: { dimensioni: true } },
        _count: { select: { varianti: true } },
      },
    });

    const scored: Array<{ art: typeof candidates[number]; score: number }> = [];
    for (const c of candidates) {
      let score = 0;

      // Raccolte in comune (+30)
      const hasCommon = c.raccolte.some((r) => raccolteSlugs.has(r.raccolta.slug));
      if (hasCommon) score += 30;

      // Colore simile con CIELAB (+20)
      if (art.coloreRgb && c.coloreRgb) {
        const srcLab = hexToLab(art.coloreRgb);
        const cLab = hexToLab(c.coloreRgb);
        const dE = Math.sqrt((srcLab.L - cLab.L) ** 2 + (srcLab.a - cLab.a) ** 2 + (srcLab.b - cLab.b) ** 2);
        if (dE < 50) score += Math.round((1 - dE / 50) * 20);
      }

      // Dimensioni vicine (+15)
      if (srcDimMin !== Infinity) {
        let cDimMin = Infinity, cDimMax = -Infinity;
        for (const v of c.varianti) {
          if (!v.dimensioni) continue;
          for (const [, val] of Object.entries(v.dimensioni as Record<string, any>)) {
            const n = Number(val?.valore);
            if (!isNaN(n)) { cDimMin = Math.min(cDimMin, n); cDimMax = Math.max(cDimMax, n); }
          }
        }
        if (cDimMin !== Infinity) {
          const overlap = Math.min(srcDimMax, cDimMax) - Math.max(srcDimMin, cDimMin);
          if (overlap > 0) score += Math.min(15, Math.round(overlap / 5));
        }
      }

      if (score > 0) scored.push({ art: c, score });
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 4);

    // Prezzi per il listino del cliente
    let codiceListino: string | null = null;
    if (clienteId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: clienteId } });
      codiceListino = customer?.codiceListino ?? null;
    }
    if (!codiceListino) {
      const fallback = await this.getFirstListino();
      codiceListino = fallback?.codice_listino ?? 'LIS1';
    }
    const ids = top.map((t) => t.art.id);
    const prezzi = await this.getPrezziMinimiArticoli(ids, codiceListino);

    return top.map((t) => this.mapArticoloCard(t.art, prezzi));
  }

  async updateArticolo(
    codiceLinea: string,
    data: { nome?: string; colore?: string; coloreRgb?: string; stato?: string; descrizione?: string | null; descrizioneDettagliata?: string | null; promptAi?: string | null; varianti?: Record<string, string>; variantiMultipli?: Record<string, number>; immaginiOrdine?: number[]; immaginiGalleria?: Record<number, boolean>; immaginiDisplay?: Record<number, { css?: string }>; immaginiTipo?: Record<number, string>; immaginiDaEliminare?: number[]; wizardStepTesti?: unknown; raccolte?: number[] },
  ) {
    const art = await this.prisma.articolo.findUnique({ where: { codiceLinea } });
    if (!art) throw new NotFoundException('Articolo non trovato');
    const updateData: Record<string, unknown> = {};
    if (data.nome !== undefined) updateData.nome = data.nome;
    if (data.colore !== undefined) updateData.colore = data.colore;
    if (data.coloreRgb !== undefined) updateData.coloreRgb = data.coloreRgb;
    if (data.descrizione !== undefined) {
      updateData.descrizione = data.descrizione;
      if (data.descrizione !== art.descrizione) {
        // Breve cambiato → aggiorna riga "> [breve]" nell'MD
        const md = data.descrizioneDettagliata ?? art.descrizioneDettagliata;
        if (md) {
          data.descrizioneDettagliata = md.replace(/^> .+$/m, `> ${data.descrizione}`);
        }
      } else if (data.descrizioneDettagliata !== undefined && data.descrizioneDettagliata !== null) {
        // Breve invariato ma MD fornito → estrae breve dall'MD
        const m = data.descrizioneDettagliata.match(/^> (.+)$/m);
        if (m && m[1] !== data.descrizione) {
          updateData.descrizione = m[1];
        }
      }
    }
    if (data.descrizioneDettagliata !== undefined) {
      updateData.descrizioneDettagliata = data.descrizioneDettagliata;
    }
    if (data.promptAi !== undefined) updateData.promptAi = data.promptAi;
    if (data.wizardStepTesti !== undefined) updateData.wizardStepTesti = data.wizardStepTesti;
    if (data.stato !== undefined) {
      if (data.stato === 'attivo' && !art.configurato) {
        throw new BadRequestException('Articolo da configurare: non puo\' essere reso visibile.');
      }
      updateData.stato = data.stato === 'attivo' ? 'ATTIVO' : 'NASCOSTO';
    }
    if (Object.keys(updateData).length > 0) {
      await this.prisma.articolo.update({ where: { codiceLinea }, data: updateData });
    }
    if (data.varianti) {
      for (const [codice, stato] of Object.entries(data.varianti)) {
        const newStato = stato === 'attivo' ? 'ATTIVO' : 'NASCOSTO';
        await this.prisma.variante.updateMany({
          where: { codice, articoloId: art.id },
          data: { stato: newStato },
        });
      }
    }
    if (data.variantiMultipli) {
      for (const [codice, multiplo] of Object.entries(data.variantiMultipli)) {
        await this.prisma.variante.updateMany({
          where: { codice, articoloId: art.id },
          data: { multiplo },
        });
      }
    }
    const deletedIds = new Set(data.immaginiDaEliminare ?? []);
    if (data.immaginiDaEliminare?.length) {
      const toDelete = await this.prisma.immagine.findMany({ where: { id: { in: data.immaginiDaEliminare }, articoloId: art.id } });
      for (const img of toDelete) {
        const rel = img.url.replace(`${ASSETS_PUBLIC_URL}/`, '');
        const filePath = path.join(ASSETS_BASE_DIR, rel);
        try { await fsp.unlink(filePath); } catch { /* file già assente */ }
        await purgeThumbCache(rel); // rimuove anche le miniature in cache
      }
      await this.prisma.immagine.deleteMany({ where: { id: { in: data.immaginiDaEliminare }, articoloId: art.id } });
    }
    if (data.immaginiOrdine) {
      // Escludi le immagini appena eliminate (altrimenti update su record inesistente)
      const ordine = data.immaginiOrdine.filter((id) => !deletedIds.has(id));
      await this.prisma.$transaction(
        ordine.map((id, idx) =>
          this.prisma.immagine.update({
            where: { id },
            data: { ordinamento: idx, copertina: idx === 0 },
          }),
        ),
      );
    }
    if (data.immaginiGalleria) {
      await this.prisma.$transaction(
        Object.entries(data.immaginiGalleria)
          .filter(([id]) => !deletedIds.has(Number(id)))
          .map(([id, val]) =>
            this.prisma.immagine.update({
              where: { id: Number(id) },
              data: { inGalleria: val },
            }),
          ),
      );
    }
    if (data.immaginiDisplay) {
      await this.prisma.$transaction(
        Object.entries(data.immaginiDisplay)
          .filter(([id]) => !deletedIds.has(Number(id)))
          .map(([id, props]) =>
            this.prisma.immagine.update({
              where: { id: Number(id) },
              data: {
                ...(props.css !== undefined ? { css: props.css } : {}),
              },
            }),
          ),
      );
    }
    if (data.immaginiTipo) {
      const allowed = ['CARICATA', 'AI'];
      await this.prisma.$transaction(
        Object.entries(data.immaginiTipo)
          .filter(([id]) => !deletedIds.has(Number(id)))
          .filter(([, tipo]) => allowed.includes(tipo))
          .map(([id, tipo]) =>
            this.prisma.immagine.update({
              where: { id: Number(id) },
              data: { tipo },
            }),
          ),
      );
    }
    // Invariante copertina: se esiste almeno un'immagine attiva (inGalleria),
    // deve esserci esattamente una copertina, ed è la prima attiva per ordinamento.
    // Copre: eliminazione/disattivazione della copertina (passa alla successiva) e
    // riattivazione quando non c'erano immagini attive (quella diventa copertina).
    {
      const imgs = await this.prisma.immagine.findMany({
        where: { articoloId: art.id },
        orderBy: [{ ordinamento: 'asc' }, { id: 'asc' }],
        select: { id: true, inGalleria: true, copertina: true },
      });
      const cover = imgs.find((i) => i.inGalleria);
      if (cover) {
        if (!cover.copertina || imgs.some((i) => i.copertina && i.id !== cover.id)) {
          await this.prisma.$transaction([
            this.prisma.immagine.updateMany({ where: { articoloId: art.id, id: { not: cover.id } }, data: { copertina: false } }),
            this.prisma.immagine.update({ where: { id: cover.id }, data: { copertina: true } }),
          ]);
        }
      } else if (imgs.some((i) => i.copertina)) {
        await this.prisma.immagine.updateMany({ where: { articoloId: art.id }, data: { copertina: false } });
      }
    }
    if (data.raccolte !== undefined) {
      await this.prisma.articoloRaccolta.deleteMany({ where: { articoloId: art.id } });
      if (data.raccolte.length > 0) {
        await this.prisma.articoloRaccolta.createMany({
          data: data.raccolte.map((raccoltaId: number) => ({ articoloId: art.id, raccoltaId })),
        });
      }
    }
    // Testo/stato/famiglia possono essere cambiati → riallinea l'embedding (fire-and-forget)
    void this.reembedArticolo(codiceLinea).catch(() => {});
    return { updated: true };
  }

  async deleteArticolo(codiceLinea: string) {
    const art = await this.prisma.articolo.findUnique({
      where: { codiceLinea },
    });
    if (!art) throw new NotFoundException('Articolo non trovato');
    // ponytail: check for orders when order model exists
    const refCount = await this.prisma.variante.count({ where: { articoloId: art.id } });
    if (refCount > 0) {
      await this.prisma.variante.deleteMany({ where: { articoloId: art.id } });
    }
    await this.prisma.articolo.delete({ where: { id: art.id } });
    return { deleted: true };
  }

  async uploadImmagini(codiceLinea: string, files: Express.Multer.File[]) {
    const art = await this.prisma.articolo.findUnique({ where: { codiceLinea } });
    if (!art) throw new NotFoundException('Articolo non trovato');
    const existingCount = await this.prisma.immagine.count({ where: { articoloId: art.id } });
    const baseDir = ASSETS_BASE_DIR;
    const safeCod = codiceLinea.replace(/[^A-Za-z0-9_-]/g, '_');
    const artDir = path.join(baseDir, safeCod);
    await fsp.mkdir(artDir, { recursive: true });
    const hasCover = await this.prisma.immagine.findFirst({ where: { articoloId: art.id, copertina: true } });
    const uploaded: { url: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = path.extname(f.originalname) || '.jpg';
      const n = String(existingCount + i + 1).padStart(3, '0');
      const filename = `${safeCod}_${n}${ext}`;
      await fsp.writeFile(path.join(artDir, filename), f.buffer);
      const img = await this.prisma.immagine.create({
        data: {
          articoloId: art.id, url: `${ASSETS_PUBLIC_URL}/${safeCod}/${filename}`, ordinamento: existingCount + i, tipo: 'CARICATA',
          copertina: !hasCover && i === 0,
        },
      });
      uploaded.push({ url: img.url });
    }
    return { uploaded };
  }

  // ── AI: ambientazione immagini (Nano Banana / Gemini 2.5 Flash Image) ──
  // Cache effimera delle generazioni: il client persiste per generationId+indici,
  // cosi' non si ricaricano megabyte di base64 e si scartano le non scelte.
  // ponytail: in-memory (singola istanza). Con piu' repliche servira' uno store condiviso.
  private aiCache = new Map<
    string,
    {
      items: { mime: string; b64: string }[];
      params: { prompt: string; model: string; aspect?: string; temperature?: number; seed?: number };
      parentImageId: number;
      aggiungiColore: boolean;
      aggiungiVariante: boolean;
      promptTemplateId?: number | null;
      ts: number;
    }
  >();

  private aiCacheGet(id: string) {
    const now = Date.now();
    for (const [k, v] of this.aiCache) if (now - v.ts > 15 * 60_000) this.aiCache.delete(k);
    return this.aiCache.get(id);
  }

  /** Legge le config AI da site_config con fallback a env → hardcoded. */
  private aiConfigCache: { ts: number; immagini: Record<string, string>; testi: Record<string, string> } | null = null;
  private readonly AI_CONFIG_TTL = 60_000; // 1 minuto

  private async getAiConfig(scope: 'immagini' | 'testi'): Promise<{
    provider: string; model: string; endpoint: string; temperature: number; maxTokens: number;
  }> {
    const now = Date.now();
    if (!this.aiConfigCache || now - this.aiConfigCache.ts > this.AI_CONFIG_TTL) {
      const rows = await this.prisma.siteConfig.findMany({
        where: { key: { startsWith: 'AI_Immagini_' } },
      });
      const rowsTesti = await this.prisma.siteConfig.findMany({
        where: { key: { startsWith: 'AI_Testi_' } },
      });
      const immagini = Object.fromEntries(rows.map(r => [r.key, r.value]));
      const testi = Object.fromEntries(rowsTesti.map(r => [r.key, r.value]));
      this.aiConfigCache = { ts: now, immagini, testi };
    }
    const map = scope === 'immagini' ? this.aiConfigCache.immagini : this.aiConfigCache.testi;
    const get = (key: string, fallback: string, env?: string) =>
      map[key] ?? (env ? (process.env[env] || fallback) : fallback);
    return {
      provider:  get(`AI_${scope === 'immagini' ? 'Immagini' : 'Testi'}_Provider`, 'gemini'),
      model:     get(`AI_${scope === 'immagini' ? 'Immagini' : 'Testi'}_Modello`,
                    scope === 'immagini' ? 'gemini-2.5-flash-image' : 'gemini-2.5-flash',
                    scope === 'immagini' ? 'GEMINI_IMAGE_MODEL' : 'GEMINI_TEXT_MODEL'),
      endpoint:  get(`AI_${scope === 'immagini' ? 'Immagini' : 'Testi'}_Endpoint`,
                    'https://generativelanguage.googleapis.com/v1beta/models/'),
      temperature: parseFloat(get(`AI_${scope === 'immagini' ? 'Immagini' : 'Testi'}_Temperature`,
                    scope === 'immagini' ? '0.4' : '0.7')),
      maxTokens: parseInt(get(`AI_${scope === 'immagini' ? 'Immagini' : 'Testi'}_MaxTokens`,
                    scope === 'immagini' ? '4096' : '8192'), 10),
    };
  }

  private async callGemini(
    prompt: string,
    srcImg: { mime: string; b64: string },
    cfg: { aspectRatio?: string; temperature?: number; seed?: number },
  ): Promise<{ mime: string; b64: string }> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new BadRequestException('Configurazione AI mancante: imposta GEMINI_API_KEY.');
    const aiCfg = await this.getAiConfig('immagini');
    const model = aiCfg.model;
    const body = {
      contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: srcImg.mime, data: srcImg.b64 } }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        ...(cfg.temperature !== undefined ? { temperature: cfg.temperature } : {}),
        ...(cfg.seed !== undefined ? { seed: cfg.seed } : {}),
        ...(cfg.aspectRatio ? { imageConfig: { aspectRatio: cfg.aspectRatio } } : {}),
      },
    };
    const url = `${aiCfg.endpoint.replace(/\/+$/, '')}/${model}:generateContent`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(body) });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      let detail = txt.slice(0, 300);
      try { detail = (JSON.parse(txt) as { error?: { message?: string } })?.error?.message ?? detail; } catch { /* testo grezzo */ }
      if (res.status === 429) {
        throw new BadRequestException(`Quota AI esaurita (429): verifica piano/billing su Google AI Studio. ${detail.slice(0, 140)}`);
      }
      throw new BadRequestException(`Errore AI (${res.status}): ${detail.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
    };
    const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part?.inlineData?.data) throw new BadRequestException("La generazione AI non ha restituito un'immagine.");
    void this.aiUsage.record({ tipo: 'immagine', modello: model, immagini: 1 });
    return { mime: part.inlineData.mimeType || 'image/png', b64: part.inlineData.data };
  }

  /** Genera N varianti ambientate dall'immagine sorgente. Non salva nulla:
   *  ritorna le immagini (base64) + un generationId per la persistenza. */
  async ambientaImmagine(
    codiceLinea: string,
    imageId: number,
    opts: { prompt: string; n?: number; aspectRatio?: string; temperature?: number; seed?: number; aggiungiColore?: boolean; aggiungiVariante?: boolean; promptTemplateId?: number | null },
  ) {
    if (!opts.prompt?.trim()) throw new BadRequestException('Inserisci un prompt.');
    const art = await this.prisma.articolo.findUnique({ where: { codiceLinea } });
    if (!art) throw new NotFoundException('Articolo non trovato');
    const img = await this.prisma.immagine.findFirst({ where: { id: imageId, articoloId: art.id } });
    if (!img) throw new NotFoundException('Immagine non trovata');

    const rel = img.url.replace(`${ASSETS_PUBLIC_URL}/`, '');
    const filePath = path.join(ASSETS_BASE_DIR, rel);
    let buf: Buffer;
    try { buf = await fsp.readFile(filePath); } catch { throw new BadRequestException('File immagine sorgente non trovato sul disco.'); }
    const ext = path.extname(filePath).toLowerCase();
    const srcMime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    const src = { mime: srcMime, b64: buf.toString('base64') };

    // Arricchisce il prompt col contesto prodotto
    const varianti = await this.prisma.variante.findMany({ where: { articoloId: art.id }, select: { codice: true, descrizione: true, dimensioni: true } });
    const caricate = await this.prisma.immagine.findMany({ where: { articoloId: art.id, tipo: 'CARICATA' }, select: { url: true, css: true, ordinamento: true }, orderBy: { ordinamento: 'asc' } });
    const ctx: string[] = [];
    const aggColore = opts.aggiungiColore !== false;
    const aggVariante = opts.aggiungiVariante !== false;
    if (art.descrizioneDettagliata) ctx.push(`Descrizione dettagliata: ${art.descrizioneDettagliata}`);
    if (art.descrizione) ctx.push(`Descrizione breve: ${art.descrizione}`);
    if (aggColore && art.colore) ctx.push(`Colore: ${art.colore}${art.coloreRgb ? ` (RGB ${art.coloreRgb})` : ''}`);
    if (aggVariante && varianti.length) ctx.push(`Varianti disponibili: ${varianti.map(v => `${v.descrizione} (${v.codice})${v.dimensioni ? ' dim:' + JSON.stringify(v.dimensioni) : ''}`).join('; ')}`);
    if (caricate.length) ctx.push(`Immagini a sfondo bianco disponibili: ${caricate.length} (posizioni ${caricate.map(c => c.ordinamento).join(', ')})`);
    const contestoProdotto = ctx.join('\n');
    const promptFinale = contestoProdotto ? `Contesto prodotto:\n${contestoProdotto}\n\nRichiesta utente:\n${opts.prompt}` : opts.prompt;

    const n = Math.min(Math.max(opts.n ?? 1, 1), 4);
    const results = await Promise.all(
      Array.from({ length: n }, (_, i) =>
        this.callGemini(promptFinale, src, {
          aspectRatio: opts.aspectRatio,
          temperature: opts.temperature,
          seed: opts.seed !== undefined ? opts.seed + i : undefined,
        }),
      ),
    );
    const generationId = randomUUID();
    const imgCfg = await this.getAiConfig('immagini');
    this.aiCache.set(generationId, {
      items: results,
      params: {
        prompt: promptFinale,
        model: imgCfg.model,
        aspect: opts.aspectRatio,
        temperature: opts.temperature,
        seed: opts.seed,
      },
      parentImageId: imageId,
      aggiungiColore: aggColore,
      aggiungiVariante: aggVariante,
      promptTemplateId: opts.promptTemplateId ?? null,
      ts: Date.now(),
    });
    return { generationId, images: results };
  }

  /** Persiste le generazioni selezionate come immagini tipo='AI'. */
  async persistAiImmagini(codiceLinea: string, generationId: string, indices: number[]) {
    const art = await this.prisma.articolo.findUnique({ where: { codiceLinea } });
    if (!art) throw new NotFoundException('Articolo non trovato');
    const gen = this.aiCacheGet(generationId);
    if (!gen) throw new BadRequestException('Generazione scaduta: rigenera le immagini.');
    const safeCod = codiceLinea.replace(/[^A-Za-z0-9_-]/g, '_');
    const artDir = path.join(ASSETS_BASE_DIR, safeCod);
    await fsp.mkdir(artDir, { recursive: true });
    let aiCount = await this.prisma.immagine.count({ where: { articoloId: art.id, tipo: 'AI' } });
    const saved: { url: string }[] = [];
    for (const idx of indices) {
      const item = gen.items[idx];
      if (!item) continue;
      const fileExt = item.mime === 'image/jpeg' ? '.jpg' : item.mime === 'image/webp' ? '.webp' : '.png';
      aiCount += 1;
      const filename = `${safeCod}_ai_${String(aiCount).padStart(3, '0')}${fileExt}`;
      await fsp.writeFile(path.join(artDir, filename), Buffer.from(item.b64, 'base64'));
      const ord = await this.prisma.immagine.count({ where: { articoloId: art.id } });
      const rec = await this.prisma.immagine.create({
        data: {
          articoloId: art.id,
          url: `${ASSETS_PUBLIC_URL}/${safeCod}/${filename}`,
          ordinamento: ord,
          tipo: 'AI',
          prompt: gen.params.prompt,
          aiModel: gen.params.model,
          aiAspect: gen.params.aspect ?? null,
          aiTemperature: gen.params.temperature ?? null,
          aiSeed: gen.params.seed ?? null,
          immaginePadreId: gen.parentImageId,
          aggiungiColore: gen.aggiungiColore,
          aggiungiVariante: gen.aggiungiVariante,
          promptTemplateId: gen.promptTemplateId ?? null,
        },
      });
      saved.push({ url: rec.url });
    }
    this.aiCache.delete(generationId);
    return { saved: saved.length, immagini: saved };
  }

  // ── AI: wizard descrizione sensoriale ──

  /** Generazione testo AI riutilizzabile (es. sintesi comportamentale cliente). */
  async generaSintesiAI(prompt: string): Promise<string> {
    return this.callGeminiText(prompt, undefined, 'insight');
  }

  private async callGeminiText(prompt: string, image?: { mime: string; b64: string }, usageTipo = 'descrizione', images?: { mime: string; b64: string }[], outputTokens?: { tokenIn?: number; tokenOut?: number }): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new BadRequestException('Configurazione AI mancante: imposta GEMINI_API_KEY.');
    const aiCfg = await this.getAiConfig('testi');
    const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [{ text: prompt }];
    if (images?.length) {
      for (const img of images) parts.push({ inlineData: { mimeType: img.mime, data: img.b64 } });
    } else if (image) {
      parts.push({ inlineData: { mimeType: image.mime, data: image.b64 } });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), images?.length ? 90000 : 60000);
    try {
      const url = `${aiCfg.endpoint.replace(/\/+$/, '')}/${aiCfg.model}:generateContent`;
      const res = await fetch(url, {
        signal: controller.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: aiCfg.temperature, maxOutputTokens: aiCfg.maxTokens },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        let detail = txt.slice(0, 300);
        try { detail = (JSON.parse(txt) as { error?: { message?: string } })?.error?.message ?? detail; } catch { /* */ }
        const userMsg = detail.includes('high demand') || detail.includes('quota')
          ? 'Il modello AI di Google è momentaneamente sovraccarico. Riprova tra qualche minuto.'
          : detail.includes('API key') || detail.includes('API_KEY_INVALID')
          ? 'La chiave API di Google Gemini non è valida. Contatta l\'amministratore.'
          : detail.slice(0, 200);
        throw new BadRequestException(`Google AI non risponde (${res.status}): ${userMsg}`);
      }
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      };
      const md = data.usageMetadata;
      void this.aiUsage.record({ tipo: usageTipo, modello: aiCfg.model, tokenIn: md?.promptTokenCount, tokenOut: md?.candidatesTokenCount });
      if (outputTokens) { outputTokens.tokenIn = md?.promptTokenCount; outputTokens.tokenOut = md?.candidatesTokenCount; }
      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.map((p) => p.text).join('\n') || '';
      const finishReason = candidate?.finishReason ?? 'UNKNOWN';
      if (finishReason !== 'STOP') {
        console.warn(`Gemini finishReason=${finishReason} (atteso STOP). Testo ricevuto: ${text.slice(0, 200)}`);
      }
      return text;
    } catch (e) {
      if (e instanceof HttpException) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      throw new BadRequestException(`Errore AI: ${msg.slice(0, 200)}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Analizza nome+descrizione via AI per estrarre colore e RGB. Cache testuale in memoria. */
  private colorExtractCache = new Map<string, { colore: string | null; coloreRgb: string | null }>();
  private async estraiColoreDaTesto(nome: string, descrizione: string): Promise<{ colore: string | null; coloreRgb: string | null }> {
    const cacheKey = `${nome}|${descrizione}`;
    const cached = this.colorExtractCache.get(cacheKey);
    if (cached) return cached;
    const prompt = `Sei un esperto di colori per articoli di vasellame e garden. Analizza nome e descrizione e restituisci SOLO un JSON valido SENZA markdown:

{
  "colore": "nome colore in italiano (es. Nocciola, Terracotta, Salvia, Antracite, Crema, Tortora)" oppure null,
  "coloreRgb": "codice esadecimale RGB #RRGGBB" oppure null
}

REGOLE IMPORTANTI:
- NO colori primari saturi (rosso #FF0000, blu #0000FF, giallo #FFFF00, verde #00FF00, ecc.)
- NO colori fluo o troppo vivaci
- SÌ colori naturali, terrosi, pastello smorzati, neutri caldi/freddi
- Il colore deve essere LEGGIBILE e NON FASTIDIOSO su sfondo BIANCO (contrasto adeguato, niente giallo chiaro, niente bianco sporco quasi invisibile)
- Se non trovi un colore chiaro, restituisci null per entrambi i campi

Nome: ${nome}
Descrizione: ${descrizione}`;
    try {
      const raw = await this.callGeminiText(prompt);
      const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/g, '').trim();
      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) throw new Error('Nessun JSON nella risposta');
      const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as { colore?: string | null; coloreRgb?: string | null };
      const result = {
        colore: typeof parsed.colore === 'string' && parsed.colore ? parsed.colore.trim() : null,
        coloreRgb: typeof parsed.coloreRgb === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.coloreRgb) ? parsed.coloreRgb.trim().toUpperCase() : null,
      };
      this.colorExtractCache.set(cacheKey, result);
      return result;
    } catch {
      return { colore: null, coloreRgb: null };
    }
  }

  private async describeWhiteImages(codiceLinea: string): Promise<string[]> {
    const immagini = await this.prisma.immagine.findMany({
      where: { articolo: { codiceLinea }, tipo: 'CARICATA' },
      orderBy: { ordinamento: 'asc' },
    });
    if (!immagini.length) return [];
    const descrizioni: string[] = [];
    for (const img of immagini) {
      const rel = img.url.replace(`${ASSETS_PUBLIC_URL}/`, '');
      const filePath = path.join(ASSETS_BASE_DIR, rel);
      let buf: Buffer;
      try { buf = await fsp.readFile(filePath); } catch { continue; }
      const ext = path.extname(filePath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      const prompt = 'Descrivi in 2-3 frasi questo prodotto per fioristi e garden, concentrandoti sugli attributi oggettivi: tipo di prodotto, materiale, forma, colore, finitura, dimensioni percepite e uso (interno/esterno). Sii concreto e preciso; non inventare ciò che non è visibile.';
      try {
        const desc = await this.callGeminiText(prompt, { mime, b64: buf.toString('base64') });
        descrizioni.push(`[Immagine ${img.ordinamento}]: ${desc}`);
      } catch {
        // salta l'immagine se la chiamata fallisce
      }
    }
    return descrizioni;
  }

  /** Costruisce il contenuto markdown completo per descrizioneDettagliata. */
  private saveDescrizioneMd(codiceLinea: string, nome: string, dettagliata: string, breve: string | null, colore: string | null, varianti: { codice: string; descrizione: string }[], stepTesti?: { step: number; label: string; testo: string }[], imgDescs?: string[], prompt?: string): string {
    const lines: string[] = [];
    lines.push(`# ${nome}`);
    lines.push('');
    if (colore) lines.push(`**Colore:** ${colore}`);
    lines.push(`**Codice linea:** ${codiceLinea}`);
    if (varianti.length) lines.push(`**Varianti:** ${varianti.map(v => `${v.descrizione} (${v.codice})`).join(', ')}`);
    lines.push('');
    if (breve) lines.push(`> ${breve}`, '');
    if (dettagliata) lines.push(dettagliata);
    if (stepTesti?.length) {
      lines.push('');
      lines.push('---');
      lines.push('');
      lines.push('## Dimensioni sensoriali (testi grezzi)');
      for (const s of stepTesti) {
        if (!s.testo?.trim()) continue;
        lines.push('');
        lines.push(`### ${s.label}`);
        lines.push(s.testo.trim());
      }
    }
    if (imgDescs?.length) {
      lines.push('');
      lines.push('---');
      lines.push('');
      lines.push('## Descrizione immagini (AI)');
      for (const d of imgDescs) {
        if (!d.trim()) continue;
        lines.push('');
        lines.push(d.trim());
      }
    }
    if (prompt) {
      lines.push('');
      lines.push('---');
      lines.push('');
      lines.push('## Prompt AI');
      lines.push('');
      lines.push('```');
      lines.push(prompt);
      lines.push('```');
    }
    return lines.join('\n');
  }

  /** Rielabora i 5 step del wizard in descrizione dettagliata + breve.
   *  Se azione='rigenera', usa eventuale promptPersonalizzato. */
  async wizardDescrizione(
    codiceLinea: string,
    body: { stepTesti: { step: number; label: string; testo: string }[]; azione?: string; promptPersonalizzato?: string },
  ) {
    const geminiTokens: { tokenIn?: number; tokenOut?: number } = {};
    try {
    const art = await this.prisma.articolo.findUnique({ where: { codiceLinea } });
    if (!art) throw new NotFoundException('Articolo non trovato');

    if (!body.stepTesti?.length || body.stepTesti.every((s) => !s.testo?.trim())) {
      throw new BadRequestException('Inserisci almeno un contributo vocale prima di generare la descrizione.');
    }

    // Cascade prompt: body > article.promptAi > siteConfig > hardcoded default
    let systemPrompt = body.promptPersonalizzato?.trim();
    if (!systemPrompt) systemPrompt = art.promptAi?.trim();
    if (!systemPrompt) {
      const sc = await this.prisma.siteConfig.findUnique({ where: { key: 'Prompt_AI_Descrizione_Articolo' } });
      systemPrompt = sc?.value?.trim();
    }
    if (!systemPrompt) {
      systemPrompt = `Sei un tecnico-specialista di vasellame e articoli garden per il canale B2B (grossista → rivenditore/fiorista).
Non sei un copywriter consumer: NON usare tono celebrativo, emotivo o da vetrina. Il lettore è un professionista che deve valutare il prodotto per acquistarlo all'ingrosso.

A partire dai contributi dell'operatore, genera una descrizione tecnico-professionale in italiano, in un unico paragrafo (150-300 parole).

Cosa descrivere (in ordine di priorità):
1. Materiale e lavorazione: tipo di ceramica/terracotta/cotto, presa della smaltatura/ingobbio, eventuale smalto a mano vs industrial, difetti artigianali accettati
2. Forma e finitura: geometria, finitura superficiale (lucida/Opaca/ruvida/rifinita), bordi, piede, eventuale imperfezione intenzionale
3. Dimensioni e peso: usa le misure reali delle varianti (non stimare), menziona tolleranze se note
4. Utilizzo professionale: interno/esterno, resistenza a gelo/intemperie, idoneità a contatto alimentare (se applicabile), manutenzione
5. Imballaggio e logistica: confezionamento, fragilità, stackabilità, peso per trasporto

Stile:
- Tutto terze persone, nessun "voi" o "tu"
- Zero aggettivi superlativi ("bellissimo", "elegante", "prestigioso") — solo fatti verificabili
- Zero storytelling emotivo ("porta la calore della terra", "character unica")
- Se non sai qualcosa, omettilo, non inventare

Oltre alla descrizione dettagliata, scrivi anche una descrizione BREVE di 4 frasi che illustri: materiale, forma chiave, dimensione di riferimento, finitura, utilizzo tipico e destinazione d'uso (interno/esterno). Tono scorrevole, da presentazione commerciale.

Rispondi SOLO con un JSON valido in questo formato, senza testo aggiuntivo:
\`\`\`json
{
  "descrizioneDettagliata": "testo della descrizione tecnico-professionale",
  "descrizioneBreve": "4 frasi descrittive: materiale, forma, dimensione, finitura, uso"
}
\`\`\``;
    }

    const contributi = body.stepTesti
      .filter((s) => s.testo?.trim())
      .map((s) => `--- ${s.label} ---\n${s.testo.trim()}`)
      .join('\n\n');

    // Descrive le immagini a sfondo bianco e le include nel contesto
    const imgDescs = await this.describeWhiteImages(codiceLinea);
    const imgSection = imgDescs.length
      ? `\n\nImmagini a sfondo bianco dell'articolo:\n${imgDescs.join('\n')}`
      : '';

    // Misure reali dal DB (varianti): l'AI deve usare queste, non stimare "a occhio".
    const variantiDim = await this.prisma.variante.findMany({
      where: { articoloId: art.id, stato: { not: 'NASCOSTO' } },
      select: { descrizione: true, dimensioni: true },
      orderBy: { codice: 'asc' },
    });
    const dimSection = variantiDim.length
      ? `\n\nVarianti e dimensioni reali (usa queste misure, non stimarle):\n${variantiDim
          .map((v) => `- ${v.descrizione}${v.dimensioni ? `: ${JSON.stringify(v.dimensioni)}` : ''}`)
          .join('\n')}`
      : '';

    // Requisiti oggettivi: garantiscono che la descrizione contenga gli attributi su
    // cui si appoggiano ricerca testuale e per immagine (embedding + boost).
    const requisiti = `\n\nRequisiti obbligatori: nella descrizione dettagliata cita in modo esplicito e concreto, quando determinabili, questi attributi oggettivi: tipo di prodotto, materiale, forma, colore, finitura, dimensioni (usa le misure reali delle varianti qui sopra), uso (interno/esterno). Non inventare attributi non presenti nelle immagini o nei dati.`;

    const fullPrompt = `${systemPrompt}\n\nContributi dell'operatore:\n${contributi}${imgSection}${dimSection}${requisiti}`;

    const raw = await this.callGeminiText(fullPrompt, undefined, 'descrizione', undefined, geminiTokens);
    console.log(`[wizardDescrizione] Gemini risposta per ${codiceLinea}: token ${geminiTokens.tokenIn}/${geminiTokens.tokenOut}, testo (${raw.length}): ${raw.slice(0, 500)}`);

    // Estrae descrizioneDettagliata e (opzionale) descrizioneBreve dal JSON di Gemini.
    // Gestisce risposte troncate (mancanza di } finale o di descrizioneBreve).
    let dettagliata = '';
    let breve = '';

    // 1. Prova a estrarre un blocco ```json { ... } ``` e parsarlo
    const codeBlock = raw.match(/```(?:json)?\s*\n?(\{[\s\S]*?\})\n?```/);
    let jsonStr = codeBlock?.[1] ?? '';
    // 2. Se nessun code block, cerca un oggetto JSON con descrizioneDettagliata nel testo
    if (!jsonStr) {
      const obj = raw.match(/\{[\s\S]*?"descrizioneDettagliata"[\s\S]*?\}/);
      jsonStr = obj?.[0] ?? '';
    }
    // 3. Prova a parsare il JSON trovato (gestendo chiusura mancante)
    if (jsonStr) {
      if (!jsonStr.endsWith('}')) {
        const b = jsonStr.lastIndexOf('}');
        if (b !== -1) jsonStr = jsonStr.slice(0, b + 1);
      }
      try {
        const p = JSON.parse(jsonStr) as Record<string, unknown>;
        if (typeof p.descrizioneDettagliata === 'string') dettagliata = p.descrizioneDettagliata.trim();
        if (typeof p.descrizioneBreve === 'string') breve = p.descrizioneBreve.trim();
      } catch { /* fallback */ }
    }
    // 4. Se ancora niente, estrazione diretta del valore con regex
    if (!dettagliata) {
      const m = raw.match(/"descrizioneDettagliata"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (m) dettagliata = m[1].trim();
      const m2 = raw.match(/"descrizioneBreve"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (m2) breve = m2[1].trim();
    }
    // 5. Fallback: separatore testuale ---BREVE---
    if (!dettagliata) {
      const sep = '---BREVE---';
      const idx = raw.indexOf(sep);
      if (idx !== -1) {
        dettagliata = raw.slice(0, idx).trim();
        breve = raw.slice(idx + sep.length).trim();
      } else {
        dettagliata = raw.trim();
      }
    }
    const soloDettagliata = dettagliata;
    const descrizioneBreve = breve || dettagliata;

    const varianti = await this.prisma.variante.findMany({ where: { articoloId: art.id }, select: { codice: true, descrizione: true } });
    const descrizioneDettagliata = this.saveDescrizioneMd(codiceLinea, art.nome, soloDettagliata, descrizioneBreve, art.colore, varianti, body.stepTesti, imgDescs, fullPrompt);

    return { descrizioneDettagliata, descrizioneBreve, tokenIn: geminiTokens.tokenIn, tokenOut: geminiTokens.tokenOut };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      const tokenMsg = geminiTokens.tokenIn != null
        ? ` (prompt: ${geminiTokens.tokenIn}, risposta: ${geminiTokens.tokenOut ?? '?'})`
        : '';
      throw new BadRequestException(`Errore generazione descrizione${tokenMsg}: ${msg.slice(0, 300)}`);
    }
  }

  /** Analizza foto scattate dall'utente tramite Gemini e restituisce le 5 osservazioni sensoriali. */
  async analizzaDescrizioneDaFoto(
    codiceLinea: string,
    files: Express.Multer.File[],
    imageIds?: number[],
  ) {
    const art = await this.prisma.articolo.findUnique({ where: { codiceLinea } });
    if (!art) throw new NotFoundException('Articolo non trovato');

    // Salva le foto caricate (inGalleria=false, non copertina)
    const nuoveImmagini: { id: number; url: string }[] = [];
    if (files?.length) {
      const baseDir = ASSETS_BASE_DIR;
      const safeCod = codiceLinea.replace(/[^A-Za-z0-9_-]/g, '_');
      const artDir = path.join(baseDir, safeCod);
      await fsp.mkdir(artDir, { recursive: true });
      const existingCount = await this.prisma.immagine.count({ where: { articoloId: art.id } });
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ext = path.extname(f.originalname) || '.jpg';
        const n = String(existingCount + i + 1).padStart(3, '0');
        const filename = `${safeCod}_${n}${ext}`;
        await fsp.writeFile(path.join(artDir, filename), f.buffer);
        const img = await this.prisma.immagine.create({
          data: {
            articoloId: art.id, url: `${ASSETS_PUBLIC_URL}/${safeCod}/${filename}`,
            ordinamento: existingCount + i, tipo: 'CARICATA', inGalleria: false,
          },
        });
        nuoveImmagini.push({ id: img.id, url: img.url });
      }
    }

    // Raccogli tutte le immagini da analizzare (nuove + esistenti per ID)
    const allIds = [
      ...nuoveImmagini.map((i) => i.id),
      ...(imageIds ?? []),
    ];
    const immagini = await this.prisma.immagine.findMany({
      where: { id: { in: allIds }, articoloId: art.id },
    });
    if (!immagini.length) throw new BadRequestException('Nessuna immagine da analizzare.');

    // Legge i file immagine dal disco
    const imgData: { mime: string; b64: string }[] = [];
    for (const img of immagini) {
      const rel = img.url.replace(`${ASSETS_PUBLIC_URL}/`, '');
      const filePath = path.join(ASSETS_BASE_DIR, rel);
      try {
        const buf = await fsp.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        imgData.push({ mime, b64: buf.toString('base64') });
      } catch {
        // salta file non leggibili
      }
    }
    if (!imgData.length) throw new BadRequestException('Nessuna immagine leggibile trovata.');

    // Legge varianti con dimensioni per suggerirle a Gemini
    const varianti = await this.prisma.variante.findMany({
      where: { articoloId: art.id },
      select: { descrizione: true, dimensioni: true },
    });
    const variantiHint = varianti.length
      ? `\n\nSe vedi più oggetti nelle foto, usa le dimensioni reali delle varianti possibili:\n${
          varianti.map((v) => {
            const dims = v.dimensioni as Record<string, { valore: string; unita: string }> | null;
            const parts: string[] = [];
            if (dims?.altezza) parts.push(`altezza ${dims.altezza.valore}${dims.altezza.unita || 'cm'}`);
            if (dims?.diametro) parts.push(`diametro ${dims.diametro.valore}${dims.diametro.unita || 'cm'}`);
            if (dims?.lunghezza) parts.push(`lunghezza ${dims.lunghezza.valore}${dims.lunghezza.unita || 'cm'}`);
            if (dims?.larghezza) parts.push(`larghezza ${dims.larghezza.valore}${dims.larghezza.unita || 'cm'}`);
            if (dims?.profondita) parts.push(`profondità ${dims.profondita.valore}${dims.profondita.unita || 'cm'}`);
            return `- ${v.descrizione}${parts.length ? ': ' + parts.join(', ') : ''}`;
          }).join('\n')
        }`
      : '';

    const prompt = `Sei un osservatore esperto di vasellame e articoli garden B2B.
Osserva le foto e descrivi il prodotto in italiano, tono tecnico-concreto. Devi produrre TUTTE E 5 le voci qui sotto, ciascuna con un testo specifico e dettagliato.

FORMA: geometria, proporzioni, struttura, bordi, profilo, piede
SUPERFICIE: materiale, finitura, liscio/ruvido, opaco/lucido, venature
CONTESTO: dove va usato, interno/esterno, luce, a cosa serve
EMOZIONE: sensazione, elegante/rustico, moderno/classico, caldo/freddo
LIBERA: peso, resistenza, particolarità, destinazione professionale
${variantiHint}
Rispondi SOLO con questo JSON esatto, senza markdown ne' altri caratteri. Tutti e 5 i campi DEVONO essere presenti:

{"forma":"...","superficie":"...","contesto":"...","emozione":"...","libera":"..."}`;

    console.log(`[analizzaDescrizione] Invio ${imgData.length} foto a Gemini per ${codiceLinea}...`);
    const raw = await this.callGeminiText(prompt, undefined, 'descrizione', imgData);
    console.log(`[analizzaDescrizione] Risposta Gemini per ${codiceLinea}: ${raw.slice(0, 2000)}`);

    let stepTesti: { step: number; label: string; testo: string }[] = [];
    let rawJson = '';

    // Trova qualsiasi blocco JSON nella risposta
    const braces = raw.match(/\{[\s\S]*\}/);
    if (braces) {
      const chiusa = braces[0].lastIndexOf('}');
      if (chiusa !== -1) {
        const jsonStr = braces[0].slice(0, chiusa + 1);
        rawJson = jsonStr;
        try {
          const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
          const labels = ['Forma', 'Superficie', 'Contesto', 'Emozione', 'Libera'];
          const keys = ['forma', 'superficie', 'contesto', 'emozione', 'libera'];

          const pLower: Record<string, unknown> = {};
          for (const k of Object.keys(parsed)) pLower[k.toLowerCase()] = parsed[k];

          // Formato array: {"osservazioni":[{"step":1,"label":"Forma","testo":"..."},...]}
          const oss = pLower['osservazioni'];
          if (Array.isArray(oss) && oss.length) {
            stepTesti = oss.map((o: Record<string, unknown>) => ({
              step: Number(o.step ?? 0),
              label: String(o.label ?? ''),
              testo: String(o.testo ?? '').trim() || 'No Data',
            }));
          }

          // Formato piatto: {"forma":"...","superficie":"..."}
          if (!stepTesti.length) {
            stepTesti = labels.map((label, i) => ({
              step: i + 1, label,
              testo: String(pLower[keys[i]] ?? '').trim() || 'No Data',
            }));
          }
        } catch { /* fallback */ }
      }
    }

    if (!stepTesti.length) {
      const labels = ['Forma', 'Superficie', 'Contesto', 'Emozione', 'Libera'];
      const keys = ['forma', 'superficie', 'contesto', 'emozione', 'libera'];
      const safe = raw.replace(/\r?\n/g, '\\n').replace(/\t/g, '\\t');
      stepTesti = labels.map((label, i) => {
        const re = new RegExp(`"${keys[i]}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'i');
        const m = safe.match(re);
        return { step: i + 1, label, testo: m?.[1]?.replace(/\\n/g, '\n').replace(/\\t/g, '\t')?.trim() || 'No Data' };
      });
      if (!rawJson) rawJson = raw.slice(0, 2000);
    }

    return { stepTesti, raw: rawJson, immagini: nuoveImmagini };
  }

  /** Restituisce il mapping corrente (utile per debug) */
  getConfig() {
    return CONFIG;
  }

  // ── PromptTemplate CRUD ──

  async getPromptTemplates() {
    return this.prisma.promptTemplate.findMany({ orderBy: { ordinamento: 'asc' } });
  }

  async getPromptTemplate(id: number) {
    const t = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Prompt template non trovato');
    return t;
  }

  async createPromptTemplate(data: { tipo: string; titolo: string; prompt: string; tags?: string; ordinamento?: number }) {
    return this.prisma.promptTemplate.create({ data });
  }

  async updatePromptTemplate(id: number, data: { tipo?: string; titolo?: string; prompt?: string; tags?: string; ordinamento?: number }) {
    const t = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Prompt template non trovato');
    return this.prisma.promptTemplate.update({ where: { id }, data });
  }

  async deletePromptTemplate(id: number) {
    const t = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Prompt template non trovato');
    return this.prisma.promptTemplate.delete({ where: { id } });
  }

  // ── Clienti (import da Integra) ──

  async searchClienti(search?: string, page = 1, limit = 50, sort?: string, dir?: 'asc' | 'desc') {
    const params: unknown[] = [];
    let idx = 1;
    const conds: string[] = [];

    if (search) {
      conds.push(`(c.codice_cliente ILIKE $${idx} OR c.ragione_sociale ILIKE $${idx} OR c.partita_iva ILIKE $${idx} OR c.email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    // Esclude già importati (per codice_cliente)
    conds.push(`NOT EXISTS (SELECT 1 FROM customers cu WHERE cu.codice_cliente = c.codice_cliente)`);
    const whereClause = `WHERE ${conds.join(' AND ')}`;
    const offset = (page - 1) * limit;

    const SORT_MAP: Record<string, string> = {
      codice: 'c.codice_cliente',
      ragioneSociale: 'c.ragione_sociale',
      citta: 'c.citta',
      listino: 'c.codice_listino',
      ordini: 'COALESCE(o.n, 0)',
    };
    const dirSql = dir === 'desc' ? 'desc' : 'asc';
    const orderBySql = sort && SORT_MAP[sort] ? SORT_MAP[sort] : 'c.ragione_sociale';
    const joinOrdini = sort === 'ordini'
      ? ` LEFT JOIN (SELECT codice_cliente, count(*) n FROM integra_ordini GROUP BY codice_cliente) o ON o.codice_cliente = c.codice_cliente`
      : '';

    try {
      const countResult = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT count(*) FROM integra_clienti c ${whereClause}`,
        ...params,
      );
      const total = Number(countResult[0].count);

      const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT c.codice_cliente, c.ragione_sociale, c.email, c.citta, c.provincia, c.codice_listino
         FROM integra_clienti c${joinOrdini} ${whereClause}
         ORDER BY ${orderBySql} ${dirSql} LIMIT $${idx} OFFSET $${idx + 1}`,
        ...params, limit, offset,
      );

      const codici = rows
        .map((r) => (r.codice_cliente ? String(r.codice_cliente) : null))
        .filter((c): c is string => !!c);

      const ordiniMap = new Map<string, number>();
      const ordiniAnnoMap = new Map<string, number>();
      const annoCorrente = new Date().getFullYear();
      if (codici.length) {
        try {
          const oc = await this.prisma.$queryRawUnsafe<{ codice_cliente: string; n: bigint; n_anno: bigint }[]>(
            `SELECT codice_cliente, count(*) as n, count(*) FILTER (WHERE anno_ordine = $2) as n_anno FROM integra_ordini WHERE codice_cliente = ANY($1) GROUP BY codice_cliente`,
            codici,
            annoCorrente,
          );
          for (const o of oc) {
            ordiniMap.set(String(o.codice_cliente), Number(o.n));
            ordiniAnnoMap.set(String(o.codice_cliente), Number(o.n_anno));
          }
        } catch {
          // Arricchimento best-effort: se integra_ordini non esiste (sync ordini
          // mai eseguita) o fallisce, numOrdini resta 0.
        }
      }

      const items = rows.map((r) => {
        const codice = r.codice_cliente ? String(r.codice_cliente) : '';
        return {
          codiceCliente: codice || null,
          ragioneSociale: r.ragione_sociale ? String(r.ragione_sociale) : '',
          email: r.email ? String(r.email) : '',
          citta: r.citta ? String(r.citta) : null,
          provincia: r.provincia ? String(r.provincia) : null,
          codiceListino: r.codice_listino ? String(r.codice_listino) : null,
          numOrdini: ordiniMap.get(codice) ?? 0,
          numOrdiniAnno: ordiniAnnoMap.get(codice) ?? 0,
        };
      });

      return { items, total, page, limit };
    } catch (err: unknown) {
      // Tabella di sync non ancora creata (sync clienti mai eseguita): niente 500
      const code = (err as { code?: string })?.code;
      const metaCode = (err as { meta?: { code?: string } })?.meta?.code;
      if (code === 'P2021' || metaCode === '42P01') {
        return { items: [], total: 0, page, limit };
      }
      throw err;
    }
  }

  async importaClienti(codici: string[]) {
    if (!codici.length) return { creati: 0, clienti: [] };

    const phs = codici.map((_, i) => `$${i + 1}`).join(',');
    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM integra_clienti WHERE codice_cliente IN (${phs})`,
      ...codici,
    );
    if (!rows.length) return { creati: 0, clienti: [] };

    const pls = codici.map((_, i) => `$${i + 1}`).join(',');
    const pagRows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM integra_pagamenti WHERE codice_cliente IN (${pls})`,
      ...codici,
    );
    const pagMap = new Map<string, Record<string, unknown>>();
    for (const p of pagRows) {
      const cod = p.codice_cliente ? String(p.codice_cliente) : null;
      if (cod) pagMap.set(cod, p);
    }

    const results: { id: number; codiceCliente: string }[] = [];
    let creati = 0;
    let aggiornati = 0;
    for (const r of rows) {
      const codice = r.codice_cliente ? String(r.codice_cliente).trim() : null;
      if (!codice) continue;

      const ragioneSociale = r.ragione_sociale ? String(r.ragione_sociale).trim() : '';
      const email = r.email ? String(r.email).trim() : '';
      const nome = ragioneSociale || (email ? email.split('@')[0] : codice);

      const pag = pagMap.get(codice);
      const fido = pag?.fido_totale != null ? Number(pag.fido_totale) : null;

      const rawListino = r.codice_listino ? String(r.codice_listino) : null;
      const listinoEffettivo = (!rawListino || rawListino === '--') ? 'LIS1' : rawListino;

      const datiComuni = {
        codiceListino: listinoEffettivo,
        email: email || `${codice.toLowerCase()}@noemail.local`,
        nome,
        ragioneSociale,
        partitaIva: r.partita_iva ? String(r.partita_iva) : null,
        telefono: r.telefono ? String(r.telefono) : null,
        sitoWeb: r.web ? String(r.web) : null,
        indirizzo: r.indirizzo ? String(r.indirizzo) : null,
        cap: r.cap ? String(r.cap) : null,
        citta: r.citta ? String(r.citta) : null,
        provincia: r.provincia ? String(r.provincia) : null,
        codicePagamento: pag?.codice_pagamento ? String(pag.codice_pagamento) : (r.codice_pagamento ? String(r.codice_pagamento) : null),
        fido,
      };

      const existing = await this.prisma.customer.findUnique({ where: { codiceCliente: codice } });
      let cust: { id: number };
      if (existing) {
        cust = await this.prisma.customer.update({
          where: { id: existing.id },
          data: { ...datiComuni },
        });
        aggiornati++;
      } else {
        const tmpPassword = Math.random().toString(36).slice(-10) + 'A1!';
        const passwordHash = await hashPassword(tmpPassword);
        cust = await this.prisma.customer.create({
          data: {
            codiceCliente: codice,
            ...datiComuni,
            passwordHash,
            stato: 'BLOCCATO',
            mustChangePassword: true,
          },
        });
        creati++;
      }

      // Assicura che il listino del cliente sia sincronizzato in cache
      try {
        const esiste = await this.prisma.$queryRawUnsafe<{ c: number }[]>(
          `SELECT 1::int AS c FROM integra_listini WHERE codice_listino = $1 LIMIT 1`,
          listinoEffettivo,
        );
        if (!esiste.length) {
          await this.prisma.$executeRawUnsafe(
            `INSERT INTO integra_listini (codice_listino, descrizione_listino, listino_obsoleto, data_modifica)
             SELECT codice_listino, descrizione_listino, 0, data_modifica
             FROM b2b_listini_testata WHERE codice_listino = $1 AND (listino_obsoleto IS NULL OR listino_obsoleto = 0)
             ON CONFLICT (codice_listino) DO NOTHING`,
            listinoEffettivo,
          );
          await this.prisma.$executeRawUnsafe(
            `DELETE FROM integra_listini_righe WHERE codice_listino = $1`,
            listinoEffettivo,
          );
          await this.prisma.$executeRawUnsafe(
            `INSERT INTO integra_listini_righe (id_riga_listino, codice_listino, codice_prodotto, id_variante, prezzo_listino, sconto_1, sconto_2, sconto_3, sconto_4, listino_obsoleto, data_modifica)
             SELECT id_riga_listino, codice_listino, codice_prodotto, id_variante, prezzo_listino, sconto_1, sconto_2, sconto_3, sconto_4, 0, data_modifica
             FROM b2b_listini_righe WHERE codice_listino = $1 AND (listino_obsoleto IS NULL OR listino_obsoleto = 0)`,
            listinoEffettivo,
          );
        }
      } catch {
        // silenzioso — il sync periodico riallineerà
      }

      // Importa ordini da integra_ordini (salta duplicati per numeroOrdine + cliente)
      try {
        const ordini = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT * FROM integra_ordini WHERE codice_cliente = $1 AND (flag_obsoleto IS NULL OR flag_obsoleto = 0)`,
          codice,
        );
        for (const o of ordini) {
          const ordineId = o.id_ordine ? Number(o.id_ordine) : null;
          if (!ordineId) continue;
          const numOrd = o.numero_ordine ? String(o.numero_ordine) : `ORD-${ordineId}`;

          const giaImportato = await this.prisma.ordineCliente.findFirst({
            where: { customerId: cust.id, numeroOrdine: numOrd },
          });
          if (giaImportato) continue;

          const righe = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
            `SELECT * FROM integra_righe_ordini WHERE id_ordine = $1`,
            ordineId,
          );
          const totaleOrdine = righe.reduce(
            (s, r) => s + (r.quantita ? Number(r.quantita) : 0) * (r.prezzo_netto ? Number(r.prezzo_netto) : 0),
            0,
          );
          const newOrd = await this.prisma.ordineCliente.create({
            data: {
              numeroOrdine: numOrd,
              dataOrdine: o.data_ordine ? new Date(String(o.data_ordine)) : null,
              customerId: cust.id,
              importoTotale: totaleOrdine > 0 ? totaleOrdine : null,
              stato: Number(o.flag_obsoleto) === 1 ? 'Annullato' : 'Ricevuto',
            },
          });
          for (const r of righe) {
            await this.prisma.rigaOrdine.create({
              data: {
                ordineId: newOrd.id,
                numeroRiga: r.id_riga ? Number(r.id_riga) : null,
                codiceProdotto: r.codice_prodotto ? String(r.codice_prodotto) : null,
                descrizione: r.descrizione_riga ? String(r.descrizione_riga) : null,
                quantita: r.quantita ? Number(r.quantita) : null,
                prezzo: r.prezzo_netto ? Number(r.prezzo_netto) : null,
              },
            });
          }
        }
      } catch {
        // integra_ordini assente o vuoto: gli ordini arriveranno dopo
      }

      results.push({ id: cust.id, codiceCliente: codice });
    }

    // AI: genera descrizione cliente solo per nuovi (quelli senza descrizione)
    for (const c of results) {
      try {
        const cust = await this.prisma.customer.findUnique({ where: { id: c.id } });
        if (cust && !cust.descrizione) {
          const descrizione = await this.generaDescrizioneCliente(cust.id);
          if (descrizione) {
            await this.prisma.customer.update({
              where: { id: c.id },
              data: { descrizioneDettagliata: descrizione },
            });
          }
        }
      } catch {
        // silenzioso
      }
    }

    // Importa gli indirizzi di spedizione (idempotente) dopo aver creato/aggiornato i clienti
    try {
      await this.importaIndirizziClienti(codici);
    } catch {
      // silenzioso — il sync periodico riallineerà
    }

    return { creati, aggiornati, clienti: results };
  }

  async importaIndirizziClienti(codici?: string[]): Promise<{ importati: number }> {
    const where =
      codici && codici.length
        ? { codiceCliente: { in: codici } }
        : { codiceCliente: { not: null } };
    const clienti = await this.prisma.customer.findMany({
      where,
      select: { id: true, codiceCliente: true },
    });

    let importati = 0;
    for (const c of clienti) {
      if (!c.codiceCliente) continue;
      const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT * FROM b2b_indirizzi_clienti
         WHERE codice_cliente = $1
           AND indirizzo IS NOT NULL AND indirizzo NOT IN ('IDEM', 'IDEM COME SOPRA')
           AND cap IS NOT NULL AND cap <> '00000'`,
        c.codiceCliente,
      );
      for (const r of rows) {
        const idDest = r.id_destinazione != null ? String(r.id_destinazione) : null;
        if (!idDest) continue;
        const ragioneSociale = r.ragione_sociale ? String(r.ragione_sociale) : null;
        const indirizzo = r.indirizzo ? String(r.indirizzo) : null;
        const cap = r.cap ? String(r.cap) : null;
        const citta = r.citta ? String(r.citta) : null;
        const provincia = r.provincia ? String(r.provincia) : null;
        const codicePorto = r.codice_porto ? String(r.codice_porto) : null;
        const codiceVettore = r.codice_vettore ? String(r.codice_vettore) : null;
        const tipoDestinazione = r.codice_tipo_destinazione
          ? String(r.codice_tipo_destinazione)
          : null;
        const flagSpedizione = String(r.codice_tipo_destinazione ?? '') === 'SP';
        const flagAbituale = String(r.flag_abituale ?? '') === 'S';
        await this.prisma.indirizzoCliente.upsert({
          where: { customerId_codiceDestinazione: { customerId: c.id, codiceDestinazione: idDest } },
          update: {
            ragioneSociale,
            indirizzo,
            cap,
            citta,
            provincia,
            flagSpedizione,
            flagAbituale,
            codicePorto,
            codiceVettore,
            tipoDestinazione,
          },
          create: {
            customerId: c.id,
            codiceDestinazione: idDest,
            ragioneSociale,
            indirizzo,
            cap,
            citta,
            provincia,
            flagSpedizione,
            flagAbituale,
            codicePorto,
            codiceVettore,
            tipoDestinazione,
          },
        });
        importati++;
      }
    }
    return { importati };
  }

  async syncOrdiniCliente(codiceCliente: string): Promise<{ importati: number }> {
    const customer = await this.prisma.customer.findUnique({ where: { codiceCliente: codiceCliente } });
    if (!customer) throw new Error('Cliente non trovato');

    let importati = 0;
    try {
      const ordini = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT * FROM integra_ordini WHERE codice_cliente = $1 AND (flag_obsoleto IS NULL OR flag_obsoleto = 0)`,
        codiceCliente,
      );
      const esistenti = new Set(
        (await this.prisma.ordineCliente.findMany({
          where: { customerId: customer.id },
          select: { numeroOrdine: true },
        })).map((o) => o.numeroOrdine),
      );

      for (const o of ordini) {
        const numOrd = o.numero_ordine ? String(o.numero_ordine) : null;
        if (!numOrd || esistenti.has(numOrd)) continue;

        const ordineId = o.id_ordine ? Number(o.id_ordine) : null;
        if (!ordineId) continue;

        const righe = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT * FROM integra_righe_ordini WHERE id_ordine = $1`,
          ordineId,
        );
        const totaleOrdine = righe.reduce(
          (s, r) => s + (r.quantita ? Number(r.quantita) : 0) * (r.prezzo_netto ? Number(r.prezzo_netto) : 0),
          0,
        );

        const newOrd = await this.prisma.ordineCliente.create({
          data: {
            numeroOrdine: numOrd,
            dataOrdine: o.data_ordine ? new Date(String(o.data_ordine)) : null,
            customerId: customer.id,
            importoTotale: totaleOrdine > 0 ? totaleOrdine : null,
            stato: Number(o.flag_obsoleto) === 1 ? 'Annullato' : 'Ricevuto',
          },
        });

        for (const r of righe) {
          await this.prisma.rigaOrdine.create({
            data: {
              ordineId: newOrd.id,
              numeroRiga: r.id_riga ? Number(r.id_riga) : null,
              codiceProdotto: r.codice_prodotto ? String(r.codice_prodotto) : null,
              descrizione: r.descrizione_riga ? String(r.descrizione_riga) : null,
              quantita: r.quantita ? Number(r.quantita) : null,
              prezzo: r.prezzo_netto ? Number(r.prezzo_netto) : null,
            },
          });
        }
        importati++;
      }
    } catch {
      // integra_ordini non disponibile
    }

    return { importati };
  }

  /** Genera descrizione AI del cliente (mix anagrafica + corrispondenza + web). */
  async getListini() {
    return this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT codice_listino, descrizione_listino, listino_obsoleto, data_modifica
       FROM integra_listini WHERE listino_obsoleto IS NULL OR listino_obsoleto = 0
       ORDER BY codice_listino`,
    ).then((rows) => rows.map((r) => ({
      codice: String(r.codice_listino),
      descrizione: r.descrizione_listino ? String(r.descrizione_listino) : '',
      obsoleto: r.listino_obsoleto ? Number(r.listino_obsoleto) : 0,
      dataModifica: r.data_modifica ? String(r.data_modifica) : null,
    })));
  }

  async searchListiniRighe(codiceListino: string, search?: string, page = 1, limit = 50, sort?: string, dir?: 'asc' | 'desc') {
    const params: unknown[] = [codiceListino];
    let idx = 2;
    const conds: string[] = [`r.codice_listino = $1`];

    const joinDesc = ` LEFT JOIN vista_integra_prodotti p ON p.pro_cod = r.codice_prodotto`;

    if (search) {
      conds.push(`(r.codice_prodotto ILIKE $${idx} OR CAST(r.id_variante AS TEXT) ILIKE $${idx} OR COALESCE(p.pro_descr, '') ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = `WHERE ${conds.join(' AND ')}`;
    const offset = (page - 1) * limit;

    const SORT_MAP: Record<string, string> = {
      codiceProdotto: 'r.codice_prodotto',
      idVariante: 'r.id_variante',
      descrizione: 'p.pro_descr',
      prezzo: 'r.prezzo_listino',
      sconto1: 'r.sconto_1',
      sconto2: 'r.sconto_2',
      sconto3: 'r.sconto_3',
      sconto4: 'r.sconto_4',
    };
    const dirSql = dir === 'desc' ? 'desc' : 'asc';
    const orderBySql = sort && SORT_MAP[sort] ? SORT_MAP[sort] : 'r.codice_prodotto';

    const countResult = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT count(*) FROM integra_listini_righe r${joinDesc} ${whereClause}`,
      ...params,
    );
    const total = Number(countResult[0].count);

    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT r.id_riga_listino, r.codice_listino, r.codice_prodotto, r.id_variante,
              r.prezzo_listino, r.sconto_1, r.sconto_2, r.sconto_3, r.sconto_4,
              p.pro_descr AS descrizione
       FROM integra_listini_righe r${joinDesc} ${whereClause}
       ORDER BY ${orderBySql} ${dirSql} LIMIT $${idx} OFFSET $${idx + 1}`,
      ...params, limit, offset,
    );

    const items = rows.map((r) => ({
      idRiga: Number(r.id_riga_listino),
      codiceListino: String(r.codice_listino),
      codiceProdotto: String(r.codice_prodotto),
      idVariante: r.id_variante ? String(r.id_variante) : null,
      descrizione: r.descrizione ? String(r.descrizione) : null,
      prezzo: r.prezzo_listino ? Number(r.prezzo_listino) : null,
      sconto1: r.sconto_1 ? Number(r.sconto_1) : null,
      sconto2: r.sconto_2 ? Number(r.sconto_2) : null,
      sconto3: r.sconto_3 ? Number(r.sconto_3) : null,
      sconto4: r.sconto_4 ? Number(r.sconto_4) : null,
    }));

    return { items, total, page, limit };
  }

  async generaDescrizioneCliente(customerId: number): Promise<string | null> {
    const cust = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { contatti: { orderBy: { data: 'desc' }, take: 10 } },
    });
    if (!cust) return null;

    const fatti: string[] = [];
    if (cust.ragioneSociale) fatti.push(`Ragione sociale: ${cust.ragioneSociale}`);
    if (cust.citta) fatti.push(`Sede: ${cust.citta}${cust.provincia ? ' (' + cust.provincia + ')' : ''}`);
    if (cust.partitaIva) fatti.push(`P.IVA: ${cust.partitaIva}`);
    if (cust.codiceListino) fatti.push(`Listino: ${cust.codiceListino}`);
    if (cust.fido != null) fatti.push(`Fido: ${cust.fido}`);
    for (const ct of cust.contatti) {
      const label = ct.tipo === 'EMAIL' ? 'Email' : ct.tipo === 'TELEFONO' ? 'Telefono' : 'Nota';
      fatti.push(`${label} (${ct.data.toISOString().slice(0, 10)}): ${ct.contenuto}`);
    }

    const contesto = fatti.join('\n');
    if (!contesto.trim()) return null;

    const prompt = `Sei un assistente che profila i clienti B2B di un grossista di arredamento per fioristi e garden.
Scrivi una breve descrizione professionale del cliente (2-3 paragrafi) combinando i dati anagrafici forniti e le note di corrispondenza.
Non inventare fatti non presenti. Stile: neutro, utile per il commerciale.

Dati cliente:
${contesto}`;
    try {
      const text = await this.callGeminiText(prompt);
      return text.trim() || null;
    } catch {
      return null;
    }
  }

  async getFirstListino() {
    const rows = await this.prisma.$queryRawUnsafe<Array<{ codice_listino: string }>>(
      `SELECT codice_listino FROM integra_listini LIMIT 1`,
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async getPrezzo(codiceListino: string, codiceProdotto: string, maxExtraSconto?: number) {
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT prezzo_listino, sconto_1, sconto_2, sconto_3, sconto_4
       FROM integra_listini_righe
       WHERE codice_listino = $1 AND codice_prodotto = $2
       LIMIT 1`,
      codiceListino,
      codiceProdotto,
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    const prezzoListino = Number(r.prezzo_listino) || 0;
    const s1 = Number(r.sconto_1) || 0;
    const s2 = Number(r.sconto_2) || 0;
    const s3 = Number(r.sconto_3) || 0;
    const s4 = Number(r.sconto_4) || 0;
    const prezzoNettoListino = prezzoListino * (1 - s1 / 100) * (1 - s2 / 100) * (1 - s3 / 100) * (1 - s4 / 100);
    const scontoListino = prezzoListino > 0 ? Math.round((1 - prezzoNettoListino / prezzoListino) * 100) : 0;
    const scontoFinale = maxExtraSconto != null && maxExtraSconto > scontoListino ? maxExtraSconto : scontoListino;
    const prezzoNetto = scontoFinale > 0 ? Math.round(prezzoListino * (1 - scontoFinale / 100) * 100) / 100 : prezzoListino;
    return {
      prezzoNetto,
      prezzoListino,
      sconto: scontoFinale,
    };
  }
}
