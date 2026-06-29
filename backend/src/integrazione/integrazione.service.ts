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
    cols: { lin_codice: 'codiceLinea', lin_descrizione: 'nome', lin_famiglia_id: 'famigliaCodice' } as const,
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

  private async queryView<T extends ViewType>(view: T) {
    const cfg = CONFIG[view];
    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM ${cfg.view}`,
    );
    const colKeys = Object.keys(cfg.cols) as (keyof typeof cfg.cols)[];
    return rows.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const srcCol of colKeys) {
        const val = row[srcCol as string];
        // ponytail: BigInt non serializzabile in JSON
        mapped[cfg.cols[srcCol]] = typeof val === 'bigint' ? Number(val) : (val ?? null);
      }
      return mapped;
    });
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

    const colKeys = Object.keys(CONFIG.prodotti.cols) as (keyof typeof CONFIG.prodotti.cols)[];
    const items = rows.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const srcCol of colKeys) {
        const val = row[srcCol as string];
        mapped[CONFIG.prodotti.cols[srcCol]] = typeof val === 'bigint' ? Number(val) : (val ?? null);
      }
      return mapped;
    });

    return { items, total, page, limit };
  }

  async importaVarianti(codici: string[]) {
    const placeholders = codici.map((_, i) => `$${i + 1}`).join(',');
    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM ${CONFIG.prodotti.view} WHERE pro_cod IN (${placeholders})`,
      ...codici,
    );
    if (!rows.length) return { creati: 0, articoli: [] };

    const colKeys = Object.keys(CONFIG.prodotti.cols) as (keyof typeof CONFIG.prodotti.cols)[];

    // Group by famigliaId
    const byFamiglia = new Map<number, Record<string, unknown>[]>();
    for (const row of rows) {
      const famId = typeof row.pro_famiglia_id === 'bigint' ? Number(row.pro_famiglia_id) : (Number(row.pro_famiglia_id) || 0);
      if (!byFamiglia.has(famId)) byFamiglia.set(famId, []);
      byFamiglia.get(famId)!.push(row);
    }

    const created = [];

    for (const [famigliaId, variants] of byFamiglia) {
      // Get famiglia info from view
      let famCodice = `FAM_${famigliaId}`;
      let famNome = `Famiglia ${famigliaId}`;
      if (famigliaId > 0) {
        const famRow = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT * FROM ${CONFIG.famiglie.view} WHERE fam_id = $1`,
          famigliaId,
        );
        if (famRow.length) {
          famCodice = String(famRow[0].fam_codice ?? famCodice);
          famNome = String(famRow[0].fam_descrizione ?? famNome);
        }
      }

      // Upsert famiglia
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO famiglie (codice, nome) VALUES ($1, $2) ON CONFLICT (codice) DO NOTHING`,
        famCodice, famNome,
      );

      // Derive codiceLinea from famiglia name (ponytail: user can rename in admin)
      const codLinea = famCodice.replace(/^FAM_/, '').replace(/[^A-Z0-9_]/g, '_');
      const nome = famNome;

      // Upsert Articolo by codiceLinea
      const art = await this.prisma.articolo.upsert({
        where: { codiceLinea: codLinea },
        create: { codiceLinea: codLinea, nome, famigliaCodice: famCodice, stato: 'NASCOSTO' },
        update: { nome, famigliaCodice: famCodice },
      });

      // Create Varianti (skip existing)
      let variantiCount = 0;
      for (const row of variants) {
        const mapRow: Record<string, unknown> = {};
        for (const srcCol of colKeys) {
          const val = row[srcCol as string];
          mapRow[String(CONFIG.prodotti.cols[srcCol])] = typeof val === 'bigint' ? Number(val) : (val ?? null);
        }
        const codice = String(mapRow.codice);
        const existing = await this.prisma.variante.findUnique({ where: { codice } });
        if (existing) continue;
        await this.prisma.variante.create({
          data: {
            codice,
            descrizione: String(mapRow.descrizione || ''),
            articoloId: art.id,
          },
        });
        variantiCount++;
      }

      created.push({ articoloId: art.id, codiceLinea: codLinea, varianti: variantiCount });
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
    return rows.map((a) => ({
      id: a.codiceLinea,
      name: a.nome,
      colore: a.colore || '',
      coloreRgb: a.coloreRgb || null,
      famigliaPrincipale: a.famigliaCodice,
      raccolte: [] as string[],
      stato: (a.stato === 'NASCOSTO' ? 'nascosto' : 'attivo') as 'attivo' | 'nascosto',
      img: a.immagini[0]?.url ?? null,
      varianti: [] as { codice: string; descIntegra?: string }[],
      variantiCount: a._count.varianti,
      configurato: a.configurato ?? false,
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
      famiglia: { codice: art.famiglia.codice, nome: art.famiglia.nome },
      variantiCount: art._count.varianti,
      updatedAt: art.updatedAt,
      descrizione: art.descrizione ?? null,
      descrizioneDettagliata: art.descrizioneDettagliata ?? null,
      wizardStepTesti: art.wizardStepTesti,
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
    data: { nome?: string; colore?: string; coloreRgb?: string; stato?: string; descrizione?: string | null; descrizioneDettagliata?: string | null; varianti?: Record<string, string>; immaginiOrdine?: number[]; immaginiGalleria?: Record<number, boolean>; immaginiDisplay?: Record<number, { css?: string }>; immaginiDaEliminare?: number[]; wizardStepTesti?: unknown },
  ) {
    const art = await this.prisma.articolo.findUnique({ where: { codiceLinea } });
    if (!art) throw new NotFoundException('Articolo non trovato');
    const updateData: Record<string, unknown> = {};
    if (data.nome !== undefined) updateData.nome = data.nome;
    if (data.colore !== undefined) updateData.colore = data.colore;
    if (data.coloreRgb !== undefined) updateData.coloreRgb = data.coloreRgb;
    if (data.descrizione !== undefined) updateData.descrizione = data.descrizione;
    if (data.descrizioneDettagliata !== undefined) updateData.descrizioneDettagliata = data.descrizioneDettagliata;
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
    // aggiorna il file .md ogni volta che cambia la descrizione
    const finalDescrizione = data.descrizioneDettagliata !== undefined ? data.descrizioneDettagliata : art.descrizioneDettagliata;
    if (finalDescrizione) {
      const varianti = await this.prisma.variante.findMany({ where: { articoloId: art.id }, select: { codice: true, descrizione: true } });
      this.saveDescrizioneMd(codiceLinea, data.nome ?? art.nome, finalDescrizione, data.descrizione !== undefined ? data.descrizione : art.descrizione, art.colore, varianti);
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

  private async callGemini(
    prompt: string,
    srcImg: { mime: string; b64: string },
    cfg: { aspectRatio?: string; temperature?: number; seed?: number },
  ): Promise<{ mime: string; b64: string }> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new BadRequestException('Configurazione AI mancante: imposta GEMINI_API_KEY.');
    const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
    const body = {
      contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: srcImg.mime, data: srcImg.b64 } }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        ...(cfg.temperature !== undefined ? { temperature: cfg.temperature } : {}),
        ...(cfg.seed !== undefined ? { seed: cfg.seed } : {}),
        ...(cfg.aspectRatio ? { imageConfig: { aspectRatio: cfg.aspectRatio } } : {}),
      },
    };
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(body) },
    );
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
    this.aiCache.set(generationId, {
      items: results,
      params: {
        prompt: promptFinale,
        model: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
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

  private async callGeminiText(prompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new BadRequestException('Configurazione AI mancante: imposta GEMINI_API_KEY.');
    const model = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
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
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') || '';
    return text;
  }

  /** Salva descrizioneDettagliata come .md nella cartella asset dell'articolo.
   *  Il file puo' essere indicizzato da LLM Wiki / RAG in futuro. */
  private saveDescrizioneMd(codiceLinea: string, nome: string, dettagliata: string, breve: string | null, colore: string | null, varianti: { codice: string; descrizione: string }[]) {
    const safeCod = codiceLinea.replace(/[^A-Za-z0-9_-]/g, '_');
    const artDir = path.join(ASSETS_BASE_DIR, safeCod);
    fs.mkdirSync(artDir, { recursive: true });
    const lines: string[] = [];
    lines.push(`# ${nome}`);
    lines.push('');
    if (colore) lines.push(`**Colore:** ${colore}`);
    lines.push(`**Codice linea:** ${codiceLinea}`);
    if (varianti.length) lines.push(`**Varianti:** ${varianti.map(v => `${v.descrizione} (${v.codice})`).join(', ')}`);
    lines.push('');
    if (breve) lines.push(`> ${breve}`, '');
    if (dettagliata) lines.push(dettagliata);
    fs.writeFileSync(path.join(artDir, `${safeCod}_descrizione.md`), lines.join('\n'), 'utf-8');
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

    const contributi = body.stepTesti
      .filter((s) => s.testo?.trim())
      .map((s) => `--- ${s.label} ---\n${s.testo.trim()}`)
      .join('\n\n');

    const systemPrompt = body.promptPersonalizzato?.trim()
      ? body.promptPersonalizzato
      : `Sei un copywriter specializzato in descrizioni prodotto per un catalogo B2B di articoli per fioristi e garden (vasi in ceramica, cotto portoghese, terracotta).

A partire dai contributi dell'operatore (suddivisi per dimensioni sensoriali), genera UNA descrizione dettagliata in italiano, in un unico paragrafo fluido e discorsivo (circa 150-300 parole).

La descrizione deve:
- Essere precisa, evocativa ma non eccessivamente poetica
- Usare un tono professionale adatto a un rivenditore B2B
- Integrare naturalmente gli spunti delle diverse dimensioni (forma, superficie, contesto, emozione)
- Essere concreta: menziona materiali, finiture, caratteristiche fisiche osservabili

Dopo la descrizione dettagliata, separa con "---BREVE---" e scrivi una descrizione BREVE di 1-3 frasi (max 200 caratteri) adatta a elenchi e card.`;

    const fullPrompt = `${systemPrompt}\n\nContributi dell'operatore:\n${contributi}`;

    const result = await this.callGeminiText(fullPrompt);

    const parts = result.split('---BREVE---');
    const descrizioneDettagliata = (parts[0] || '').trim();
    const descrizioneBreve = (parts[1] || descrizioneDettagliata.slice(0, 200)).trim();

    // salva il .md subito dopo la generazione
    const varianti = await this.prisma.variante.findMany({ where: { articoloId: art.id }, select: { codice: true, descrizione: true } });
    this.saveDescrizioneMd(codiceLinea, art.nome, descrizioneDettagliata, descrizioneBreve, art.colore, varianti);

    return { descrizioneDettagliata, descrizioneBreve, raw: result };
  }

  /** Restituisce il mapping corrente (utile per debug) */
  getConfig() {
    return CONFIG;
  }
}
