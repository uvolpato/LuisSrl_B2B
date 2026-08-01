import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { IntegrazioneService } from './integrazione.service';

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
  constructor(private readonly integrazione: IntegrazioneService) {}

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
