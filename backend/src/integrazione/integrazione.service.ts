import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

// ponytail: mapping configurabile — quando arrivano le viste FDW reali,
// cambi i nomi view e/o le colonne qui, il resto del codice resta identico.
const CONFIG = {
  famiglie: {
    view: 'vista_integra_famiglie',
    cols: { fam_id: 'id', fam_codice: 'codice', fam_descrizione: 'nome', fam_parent_id: 'codicePadre' } as const,
  },
  linee: {
    view: 'vista_integra_linee',
    cols: { lin_id: 'id', lin_codice: 'codiceLinea', lin_descrizione: 'nome', lin_famiglia_id: 'famigliaCodice' } as const,
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

type ViewType = keyof typeof CONFIG;

@Injectable()
export class IntegrazioneService {
  constructor(private readonly prisma: PrismaService) {}

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

  async searchProdotti(search?: string, famigliaId?: number, page = 1, limit = 50) {
    const where = [];
    const params: unknown[] = [];
    let idx = 1;
    if (search) {
      where.push(`(pro_cod ILIKE $${idx} OR pro_descr ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (famigliaId) {
      where.push(`pro_famiglia_id = $${idx}`);
      params.push(famigliaId);
      idx++;
    }
    where.push(`NOT EXISTS (SELECT 1 FROM varianti WHERE codice = pro_cod)`);
    const whereClause = `WHERE ${where.join(' AND ')}`;
    const offset = (page - 1) * limit;

    const countResult = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT count(*) FROM ${CONFIG.prodotti.view} ${whereClause}`,
      ...params,
    );
    const total = Number(countResult[0].count);

    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM ${CONFIG.prodotti.view} ${whereClause} ORDER BY pro_cod LIMIT $${idx} OFFSET $${idx + 1}`,
      ...params, limit, offset,
    );

    const items = rows.map((row) => this.mapRow(CONFIG.prodotti.cols, row));

    return { items, total, page, limit };
  }

  async importaVarianti(codici: string[]) {
    const placeholders = codici.map((_, i) => `$${i + 1}`).join(',');
    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM ${CONFIG.prodotti.view} WHERE pro_cod IN (${placeholders})`,
      ...codici,
    );
    if (!rows.length) return { creati: 0, articoli: [] };

    // Group by famigliaId
    const byFamiglia = new Map<number, Record<string, unknown>[]>();
    for (const row of rows) {
      const famId = typeof row.pro_famiglia_id === 'bigint' ? Number(row.pro_famiglia_id) : (Number(row.pro_famiglia_id) || 0);
      if (!byFamiglia.has(famId)) byFamiglia.set(famId, []);
      byFamiglia.get(famId)!.push(row);
    }

    const created = [];

    // Legge prompt AI di default dalla configurazione sito
    let defaultPrompt: string | undefined;
    const sc = await this.prisma.siteConfig.findUnique({ where: { key: 'Prompt_AI_Descrizione_Articolo' } });
    if (sc?.value?.trim()) defaultPrompt = sc.value.trim();

    // Upsert Famiglia portale dalla vista famiglie; fallback su placeholder.
    const upsertFamiglia = async (famId: number | null): Promise<string> => {
      if (famId) {
        const famRow = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT * FROM ${CONFIG.famiglie.view} WHERE fam_id = $1`,
          famId,
        );
        if (famRow.length) {
          const codice = String(famRow[0].fam_codice);
          await this.prisma.$executeRawUnsafe(
            `INSERT INTO famiglie (codice, nome, updated_at) VALUES ($1, $2, now()) ON CONFLICT (codice) DO NOTHING`,
            codice, String(famRow[0].fam_descrizione ?? codice),
          );
          return codice;
        }
      }
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO famiglie (codice, nome, updated_at) VALUES ($1, $2, now()) ON CONFLICT (codice) DO NOTHING`,
        'INTEGRA', 'Integra (senza famiglia)',
      );
      return 'INTEGRA';
    };

    const mapProdotto = (row: Record<string, unknown>) => this.mapRow(CONFIG.prodotti.cols, row);

    for (const [parentId, variants] of byFamiglia) {
      // parentId (pro_famiglia_id) può essere l'id di una LINEA (aggregato
      // articolo), di una FAMIGLIA (prodotti senza linea) o 0/assente.
      const lineaRow = parentId > 0
        ? await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
            `SELECT * FROM ${CONFIG.linee.view} WHERE lin_id = $1`,
            parentId,
          )
        : [];

      if (lineaRow.length) {
        // ── Linea trovata: un Articolo per linea, prodotti come varianti ──
        const famCodice = await upsertFamiglia(Number(lineaRow[0].lin_famiglia_id) || null);
        const codLinea = String(lineaRow[0].lin_codice).replace(/^linea_/i, '').replace(/[^A-Za-z0-9_]/g, '_');
        const nome = String(lineaRow[0].lin_descrizione ?? codLinea);

        const art = await this.prisma.articolo.upsert({
          where: { codiceLinea: codLinea },
          create: { codiceLinea: codLinea, nome, famigliaCodice: famCodice, stato: 'NASCOSTO', promptAi: defaultPrompt },
          update: { nome, famigliaCodice: famCodice },
        });

        let variantiCount = 0;
        for (const row of variants) {
          const mapRow = mapProdotto(row);
          const codice = String(mapRow.codice);
          const existing = await this.prisma.variante.findUnique({ where: { codice } });
          if (existing) continue;
          await this.prisma.variante.create({
            data: { codice, descrizione: String(mapRow.descrizione || ''), articoloId: art.id },
          });
          variantiCount++;
        }

        created.push({ articoloId: art.id, codiceLinea: codLinea, varianti: variantiCount });
      } else {
        // ── Nessuna linea (prodotti direttamente sotto famiglia, o senza
        //    padre): "articoli senza linea" = un Articolo per prodotto. ──
        const famCodice = await upsertFamiglia(parentId > 0 ? parentId : null);

        for (const row of variants) {
          const mapRow = mapProdotto(row);
          const codice = String(mapRow.codice);
          const descrizione = String(mapRow.descrizione || '');

          const art = await this.prisma.articolo.upsert({
            where: { codiceLinea: codice },
            create: { codiceLinea: codice, nome: descrizione, famigliaCodice: famCodice, stato: 'NASCOSTO', promptAi: defaultPrompt },
            update: { nome: descrizione },
          });

          const existing = await this.prisma.variante.findUnique({ where: { codice } });
          if (!existing) {
            await this.prisma.variante.create({
              data: { codice, descrizione, articoloId: art.id },
            });
          }
          created.push({ articoloId: art.id, codiceLinea: codice, varianti: 1 });
        }
      }
    }

    return { creati: created.length, articoli: created };
  }

  async getArticoli() {
    const rows = await this.prisma.articolo.findMany({
      include: {
        _count: { select: { varianti: true } },
        immagini: { where: { copertina: true }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
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
        variantiCount: a._count.varianti,
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
    if (!art.descrizioneAI || !art.descrizioneAI.trim()) mancanti.push('una descrizione AI');
    if (mancanti.length) {
      throw new BadRequestException(`Impossibile configurare: manca ${mancanti.join(', ')}.`);
    }
    await this.prisma.articolo.update({ where: { codiceLinea }, data: { configurato: true } });
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
    if (!art) throw new Error('Articolo non trovato');
    return {
      id: art.codiceLinea,
      codiceLinea: art.codiceLinea,
      nome: art.nome,
      colore: art.colore,
      coloreRgb: art.coloreRgb || null,
      stato: art.stato === 'NASCOSTO' ? 'nascosto' : 'attivo',
      configurato: art.configurato,
      famiglia: { codice: art.famiglia.codice, nome: art.famiglia.nomePortale || art.famiglia.nome },
      variantiCount: art._count.varianti,
      updatedAt: art.updatedAt,
      descrizione: art.descrizione ?? null,
      descrizioneDettagliata: art.descrizioneDettagliata ?? null,
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

  async updateArticolo(
    codiceLinea: string,
    data: { nome?: string; colore?: string; coloreRgb?: string; stato?: string; descrizione?: string | null; descrizioneDettagliata?: string | null; promptAi?: string | null; varianti?: Record<string, string>; immaginiOrdine?: number[]; immaginiGalleria?: Record<number, boolean>; immaginiDisplay?: Record<number, { css?: string }>; immaginiDaEliminare?: number[]; wizardStepTesti?: unknown; raccolte?: number[] },
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
    if (data.immaginiDaEliminare?.length) {
      const toDelete = await this.prisma.immagine.findMany({ where: { id: { in: data.immaginiDaEliminare }, articoloId: art.id } });
      for (const img of toDelete) {
        const filePath = path.join(ASSETS_BASE_DIR, img.url.replace(`${ASSETS_PUBLIC_URL}/`, ''));
        try { fs.unlinkSync(filePath); } catch { /* file già assente */ }
      }
      await this.prisma.immagine.deleteMany({ where: { id: { in: data.immaginiDaEliminare }, articoloId: art.id } });
    }
    if (data.immaginiOrdine) {
      await this.prisma.$transaction(
        data.immaginiOrdine.map((id, idx) =>
          this.prisma.immagine.update({
            where: { id },
            data: { ordinamento: idx, copertina: idx === 0 },
          }),
        ),
      );
    }
    if (data.immaginiGalleria) {
      await this.prisma.$transaction(
        Object.entries(data.immaginiGalleria).map(([id, val]) =>
          this.prisma.immagine.update({
            where: { id: Number(id) },
            data: { inGalleria: val },
          }),
        ),
      );
    }
    if (data.immaginiDisplay) {
      await this.prisma.$transaction(
        Object.entries(data.immaginiDisplay).map(([id, props]) =>
          this.prisma.immagine.update({
            where: { id: Number(id) },
            data: {
              ...(props.css !== undefined ? { css: props.css } : {}),
            },
          }),
        ),
      );
    }
    if (data.raccolte !== undefined) {
      await this.prisma.articoloRaccolta.deleteMany({ where: { articoloId: art.id } });
      if (data.raccolte.length > 0) {
        await this.prisma.articoloRaccolta.createMany({
          data: data.raccolte.map((raccoltaId: number) => ({ articoloId: art.id, raccoltaId })),
        });
      }
    }
    return { updated: true };
  }

  async deleteArticolo(codiceLinea: string) {
    const art = await this.prisma.articolo.findUnique({
      where: { codiceLinea },
    });
    if (!art) throw new Error('Articolo non trovato');
    // ponytail: check for orders when order model exists
    const refCount = await this.prisma.variante.count({ where: { articoloId: art.id } });
    if (refCount > 0) {
      await this.prisma.variante.deleteMany({ where: { articoloId: art.id } });
    }
    await this.prisma.articolo.delete({ where: { id: art.id } });
    return { deleted: true };
  }

  async uploadImmagini(codiceLinea: string, files: any[], tipo = 'CARICATA') {
    const art = await this.prisma.articolo.findUnique({ where: { codiceLinea } });
    if (!art) throw new Error('Articolo non trovato');
    const existingCount = await this.prisma.immagine.count({ where: { articoloId: art.id, tipo } });
    const baseDir = ASSETS_BASE_DIR;
    // ponytail: neutralizza path traversal — codiceLinea finisce nel filesystem
    const safeCod = codiceLinea.replace(/[^A-Za-z0-9_-]/g, '_');
    const artDir = path.join(baseDir, safeCod);
    fs.mkdirSync(artDir, { recursive: true });
    // infisso del nome file in base al tipo/tab: bianco / galleria / ai
    const infisso = ({ CARICATA: 'bianco', GALLERIA: 'galleria', AI: 'ai' } as Record<string, string>)[tipo] ?? tipo.toLowerCase();
    const uploaded: { url: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = path.extname(f.originalname) || '.jpg';
      const n = String(existingCount + i + 1).padStart(3, '0');
      const filename = `${safeCod}_${infisso}_${n}${ext}`;
      fs.writeFileSync(path.join(artDir, filename), f.buffer);
      const img = await this.prisma.immagine.create({
        data: { articoloId: art.id, url: `${ASSETS_PUBLIC_URL}/${safeCod}/${filename}`, ordinamento: existingCount + i, tipo },
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
    return { mime: part.inlineData.mimeType || 'image/png', b64: part.inlineData.data };
  }

  /** Genera N varianti ambientate dall'immagine sorgente. Non salva nulla:
   *  ritorna le immagini (base64) + un generationId per la persistenza. */
  async ambientaImmagine(
    codiceLinea: string,
    imageId: number,
    opts: { prompt: string; n?: number; aspectRatio?: string; temperature?: number; seed?: number },
  ) {
    if (!opts.prompt?.trim()) throw new BadRequestException('Inserisci un prompt.');
    const art = await this.prisma.articolo.findUnique({ where: { codiceLinea } });
    if (!art) throw new NotFoundException('Articolo non trovato');
    const img = await this.prisma.immagine.findFirst({ where: { id: imageId, articoloId: art.id } });
    if (!img) throw new NotFoundException('Immagine non trovata');

    const rel = img.url.replace(`${ASSETS_PUBLIC_URL}/`, '');
    const filePath = path.join(ASSETS_BASE_DIR, rel);
    let buf: Buffer;
    try { buf = fs.readFileSync(filePath); } catch { throw new BadRequestException('File immagine sorgente non trovato sul disco.'); }
    const ext = path.extname(filePath).toLowerCase();
    const srcMime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    const src = { mime: srcMime, b64: buf.toString('base64') };

    // Arricchisce il prompt col contesto prodotto
    const varianti = await this.prisma.variante.findMany({ where: { articoloId: art.id }, select: { codice: true, descrizione: true, dimensioni: true } });
    const caricate = await this.prisma.immagine.findMany({ where: { articoloId: art.id, tipo: 'CARICATA' }, select: { url: true, css: true, ordinamento: true }, orderBy: { ordinamento: 'asc' } });
    const ctx: string[] = [];
    if (art.descrizioneDettagliata) ctx.push(`Descrizione dettagliata: ${art.descrizioneDettagliata}`);
    if (art.descrizione) ctx.push(`Descrizione breve: ${art.descrizione}`);
    if (art.colore) ctx.push(`Colore: ${art.colore}${art.coloreRgb ? ` (RGB ${art.coloreRgb})` : ''}`);
    if (varianti.length) ctx.push(`Varianti disponibili: ${varianti.map(v => `${v.descrizione} (${v.codice})${v.dimensioni ? ' dim:' + JSON.stringify(v.dimensioni) : ''}`).join('; ')}`);
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
    fs.mkdirSync(artDir, { recursive: true });
    let aiCount = await this.prisma.immagine.count({ where: { articoloId: art.id, tipo: 'AI' } });
    const saved: { url: string }[] = [];
    for (const idx of indices) {
      const item = gen.items[idx];
      if (!item) continue;
      const fileExt = item.mime === 'image/jpeg' ? '.jpg' : item.mime === 'image/webp' ? '.webp' : '.png';
      aiCount += 1;
      const filename = `${safeCod}_ai_${String(aiCount).padStart(3, '0')}${fileExt}`;
      fs.writeFileSync(path.join(artDir, filename), Buffer.from(item.b64, 'base64'));
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
        },
      });
      saved.push({ url: rec.url });
    }
    this.aiCache.delete(generationId);
    return { saved: saved.length, immagini: saved };
  }

  // ── AI: wizard descrizione sensoriale ──

  private async callGeminiText(prompt: string, image?: { mime: string; b64: string }): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new BadRequestException('Configurazione AI mancante: imposta GEMINI_API_KEY.');
    const aiCfg = await this.getAiConfig('testi');
    const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [{ text: prompt }];
    if (image) parts.push({ inlineData: { mimeType: image.mime, data: image.b64 } });
    const url = `${aiCfg.endpoint.replace(/\/+$/, '')}/${aiCfg.model}:generateContent`;
    const res = await fetch(url, {
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
      },
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      let detail = txt.slice(0, 300);
      try { detail = (JSON.parse(txt) as { error?: { message?: string } })?.error?.message ?? detail; } catch { /* */ }
      throw new BadRequestException(`Errore AI testo (${res.status}): ${detail.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    };
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text).join('\n') || '';
    const finishReason = candidate?.finishReason ?? 'UNKNOWN';
    if (finishReason !== 'STOP') {
      console.warn(`Gemini finishReason=${finishReason} (atteso STOP). Testo ricevuto: ${text.slice(0, 200)}`);
    }
    return text;
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
      try { buf = fs.readFileSync(filePath); } catch { continue; }
      const ext = path.extname(filePath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      const prompt = 'Descrivi in 2-3 frasi questo prodotto per fioristi e garden, concentrandoti su forma, materiale, finitura, dimensioni percepite e colore. Sii concreto e preciso.';
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
      systemPrompt = `Sei un copywriter specializzato in descrizioni prodotto per un catalogo B2B di articoli per fioristi e garden (vasi in ceramica, cotto portoghese, terracotta).

A partire dai contributi dell'operatore (suddivisi per dimensioni sensoriali), genera una descrizione dettagliata in italiano, in un unico paragrafo fluido e discorsivo (circa 150-300 parole).

La descrizione deve:
- Essere precisa, evocativa ma non eccessivamente poetica
- Usare un tono professionale adatto a un rivenditore B2B
- Integrare naturalmente gli spunti delle diverse dimensioni (forma, superficie, contesto, emozione)
- Essere concreta: menziona materiali, finiture, caratteristiche fisiche osservabili

Oltre alla descrizione dettagliata, scrivi anche una descrizione BREVE di 3-5 frasi, discorsiva e accattivante, adatta a un catalogo o a una card prodotto.

Rispondi SOLO con un JSON valido in questo formato, senza testo aggiuntivo:
\`\`\`json
{
  "descrizioneDettagliata": "testo della descrizione dettagliata in un unico paragrafo",
  "descrizioneBreve": "testo della descrizione breve, 3-5 frasi"
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

    const fullPrompt = `${systemPrompt}\n\nContributi dell'operatore:\n${contributi}${imgSection}`;

    const raw = await this.callGeminiText(fullPrompt);

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

    return { descrizioneDettagliata, descrizioneBreve, raw };
  }

  /** Restituisce il mapping corrente (utile per debug) */
  getConfig() {
    return CONFIG;
  }
}
