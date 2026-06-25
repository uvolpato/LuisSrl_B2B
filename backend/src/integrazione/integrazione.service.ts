import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';

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

const UPLOAD_BASE_DIR = path.resolve(process.env.UPLOAD_BASE_DIR || path.join(process.cwd(), '..', 'frontend', 'public', 'images'));
const UPLOAD_PUBLIC_URL = process.env.UPLOAD_PUBLIC_URL || '/images';

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
    if (!art) throw new Error('Articolo non trovato');
    const nuovoStato = art.stato === 'ATTIVO' ? 'NASCOSTO' : 'ATTIVO';
    await this.prisma.articolo.update({
      where: { codiceLinea },
      data: { stato: nuovoStato },
    });
    return { stato: nuovoStato === 'ATTIVO' ? 'attivo' : 'nascosto' };
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
      varianti: art.varianti.map((v) => ({
        codice: v.codice,
        descrizione: v.descrizione,
        dimensioni: v.dimensioni,
        multiplo: v.multiplo,
        giacenza: v.giacenza,
        stato: v.stato === 'NASCOSTO' ? 'nascosto' : 'attivo',
      })),
      immagini: art.immagini.map((i) => ({ id: i.id, url: i.url, ordinamento: i.ordinamento, copertina: i.copertina, tipo: i.tipo, inGalleria: i.inGalleria })),
    };
  }

  async updateArticolo(
    codiceLinea: string,
    data: { nome?: string; colore?: string; coloreRgb?: string; stato?: string; varianti?: Record<string, string>; immaginiOrdine?: number[]; immaginiGalleria?: Record<number, boolean> },
  ) {
    const art = await this.prisma.articolo.findUnique({ where: { codiceLinea } });
    if (!art) throw new Error('Articolo non trovato');
    const updateData: Record<string, unknown> = {};
    if (data.nome !== undefined) updateData.nome = data.nome;
    if (data.colore !== undefined) updateData.colore = data.colore;
    if (data.coloreRgb !== undefined) updateData.coloreRgb = data.coloreRgb;
    if (data.stato !== undefined) updateData.stato = data.stato === 'attivo' ? 'ATTIVO' : 'NASCOSTO';
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
    const baseDir = UPLOAD_BASE_DIR;
    // ponytail: neutralizza path traversal — codiceLinea finisce nel filesystem
    const safeCod = codiceLinea.replace(/[^A-Za-z0-9_-]/g, '_');
    const artDir = path.join(baseDir, safeCod);
    fs.mkdirSync(artDir, { recursive: true });
    const uploaded: { url: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = path.extname(f.originalname) || '.jpg';
      const n = String(existingCount + i + 1).padStart(3, '0');
      const filename = `${safeCod}_bianco_${n}${ext}`;
      fs.writeFileSync(path.join(artDir, filename), f.buffer);
      const img = await this.prisma.immagine.create({
        data: { articoloId: art.id, url: `${UPLOAD_PUBLIC_URL}/${safeCod}/${filename}`, ordinamento: existingCount + i, tipo },
      });
      uploaded.push({ url: img.url });
    }
    return { uploaded };
  }

  /** Restituisce il mapping corrente (utile per debug) */
  getConfig() {
    return CONFIG;
  }
}
