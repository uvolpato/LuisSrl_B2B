import { Controller, Get, Header, NotFoundException, Param, Query } from '@nestjs/common';
import { IntegrazioneService } from './integrazione.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Scheda articolo in anteprima pubblica, raggiungibile dal link "Condividi"
 * della scheda cliente (`/p/<codiceLinea>`).
 *
 * Espone descrizioni, immagini e varianti (dimensioni/codici) ma MAI prezzi,
 * disponibilità, sconti o campi interni. Bloccabile in un colpo solo mettendo
 * `PUBLIC_ARTICLE_SHARING=false` in .env: l'endpoint risponde 404 e il
 * frontend rimanda al login.
 */
@Controller('catalogo/pubblico')
export class CatalogoPublicController {
  constructor(
    private readonly integrazione: IntegrazioneService,
    private readonly prisma: PrismaService,
  ) {}

  /** Famiglie per il sito vetrina (sezione Collezioni). Stesso elenco della pagina
   *  Famiglie del B2B, ma solo campi di presentazione: niente conteggi, stato o
   *  dati commerciali. Dichiarata prima di `:codiceLinea` per non esserne catturata. */
  @Get('famiglie')
  @Header('Cache-Control', 'public, max-age=300')
  async getFamigliePubbliche() {
    const fams = await this.integrazione.getFamiglieCliente();
    return fams.map((f) => ({
      codice: f.codice,
      nome: f.nome,
      descrizione: f.descrizione,
      immagine: f.immagine,
      immagineAI: f.immagineAI,
    }));
  }

  /** Catalogo per il sito vetrina. Accetta SOLO page/famiglia/q: i filtri prezzo,
   *  sort e listino del catalogo cliente non sono raggiungibili (niente oracolo sui prezzi).
   *  Risposta senza prezzi, sconti né disponibilità. */
  @Get('articoli')
  @Header('Cache-Control', 'public, max-age=300')
  async getArticoliPubblici(
    @Query('page') page?: string,
    @Query('famiglia') famiglia?: string,
    @Query('q') q?: string,
  ) {
    const res = await this.integrazione.getCatalogoPaginato({
      page: Math.min(Math.max(parseInt(page ?? '1', 10) || 1, 1), 100),
      pageSize: 24,
      famiglia: typeof famiglia === 'string' && famiglia ? [famiglia.slice(0, 50)] : undefined,
      q: typeof q === 'string' && q.trim() ? q.trim().slice(0, 100) : undefined,
    });
    const codici = res.articoli.map((a) => a.id);
    const dettagli = codici.length
      ? await this.prisma.articolo.findMany({
          where: { codiceLinea: { in: codici } },
          select: {
            codiceLinea: true,
            descrizione: true,
            varianti: {
              where: { stato: { not: 'NASCOSTO' } },
              select: { codice: true, dimensioni: true },
              orderBy: [{ ordinamento: 'asc' }, { codice: 'asc' }],
            },
          },
        })
      : [];
    const perCodice = new Map(dettagli.map((d) => [d.codiceLinea, d]));
    return {
      total: res.total,
      hasMore: res.hasMore,
      articoli: res.articoli.map((a) => {
        const d = perCodice.get(a.id);
        return {
          codiceLinea: a.id,
          nome: a.nome,
          descrizione: d?.descrizione ?? null,
          famiglia: a.famiglia,
          img: a.img,
          imgAI: a.imgTipo === 'AI',
          varianti: (d?.varianti ?? []).map((v) => ({
            codice: v.codice,
            dimensioni: formatDimensioni(v.dimensioni),
          })),
        };
      }),
    };
  }

  @Get(':codiceLinea')
  async getArticoloPubblico(@Param('codiceLinea') codiceLinea: string) {
    if (process.env.PUBLIC_ARTICLE_SHARING === 'false') {
      throw new NotFoundException('catalogo.articolo_non_trovato');
    }
    const art = await this.integrazione.getArticolo(codiceLinea).catch(() => null);
    if (!art || art.stato !== 'attivo' || !art.configurato) {
      throw new NotFoundException('catalogo.articolo_non_trovato');
    }
    if (art.famiglia?.stato && art.famiglia.stato !== 'ATTIVO') {
      throw new NotFoundException('catalogo.articolo_non_trovato');
    }
    return {
      id: art.id,
      codiceLinea: art.codiceLinea,
      nome: art.nome,
      colore: art.colore,
      coloreRgb: art.coloreRgb,
      stato: art.stato,
      configurato: art.configurato,
      famiglia: { codice: art.famiglia.codice, nome: art.famiglia.nome },
      variantiCount: art.varianti.filter((v: any) => v.stato === 'attivo').length,
      descrizione: art.descrizione ?? null,
      descrizioneAI: art.descrizioneAI ?? null,
      descrizioneDettagliata: art.descrizioneDettagliata ?? null,
      raccolte: art.raccolte.map((r: any) => ({
        id: r.id,
        nome: r.nome,
        slug: r.slug,
        stato: r.stato,
      })),
      varianti: art.varianti
        .filter((v: any) => v.stato === 'attivo')
        .map((v: any) => ({
          codice: v.codice,
          descrizione: v.descrizione,
          dimensioni: v.dimensioni,
          stato: v.stato,
        })),
      immagini: art.immagini.map((i: any) => ({
        id: i.id,
        url: i.url,
        ordinamento: i.ordinamento,
        copertina: i.copertina,
        tipo: i.tipo,
        inGalleria: i.inGalleria,
        css: i.css,
      })),
    };
  }
}

/** {diametro:{valore:40}, altezza:{valore:50}} → "Ø40 H50" (stesso formato dell'anteprima /p). */
function formatDimensioni(d: unknown): string {
  if (!d || typeof d !== 'object') return '';
  const dim = d as Record<string, { valore?: unknown } | undefined>;
  return ([['diametro', 'Ø'], ['altezza', 'H']] as const)
    .map(([k, prefix]) => (dim[k]?.valore != null ? `${prefix}${String(dim[k]!.valore)}` : ''))
    .filter(Boolean)
    .join(' ');
}
