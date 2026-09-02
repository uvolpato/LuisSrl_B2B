import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IntegrazioneService } from './integrazione.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import type { AuthenticatedRequest } from '../auth/guards/authenticated.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { EventsService } from '../events/events.service';

/** Catalogo lato cliente: articoli configurati e attivi, prezzi IVA esclusa. */
@Controller('catalogo')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('customer', 'admin')
export class CatalogoController {
  constructor(
    private readonly integrazione: IntegrazioneService,
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  /** Codice listino del cliente autenticato (fallback: config → primo listino → LIS1). */
  private async listinoDi(req?: AuthenticatedRequest): Promise<string> {
    if (req?.user?.id) return this.integrazione.codiceListinoCliente(req.user.id);
    return (await this.integrazione.getFirstListino())?.codice_listino ?? 'LIS1';
  }

  /** Lista paginata (infinite-scroll): filtri, ricerca testo, sort lato server. */
  @Get()
  async getCatalogo(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('famiglia') famiglia?: string,
    @Query('raccolte') raccolte?: string,
    @Query('tab') tab?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
    @Query('colore') colore?: string,
    @Query('diametroMin') diametroMin?: string,
    @Query('diametroMax') diametroMax?: string,
    @Query('altezzaMin') altezzaMin?: string,
    @Query('altezzaMax') altezzaMax?: string,
    @Query('prezzoMin') prezzoMin?: string,
    @Query('prezzoMax') prezzoMax?: string,
    @Query('coloreRgb') coloreRgb?: string,
    @Query('coloreTolleranza') coloreTolleranza?: string,
    @Query('codiceLinea') codiceLinea?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const codiceListino = await this.listinoDi(req);
    return this.integrazione.getCatalogoPaginato({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 24,
      famiglia: famiglia ? famiglia.split(',').filter(Boolean) : undefined,
      raccolte: raccolte ? raccolte.split(',').filter(Boolean) : undefined,
      tab: tab || undefined,
      q: q || undefined,
      sort: sort || undefined,
      colore: colore ? colore.split(',').filter(Boolean) : undefined,
      diametroMin: diametroMin ? parseFloat(diametroMin) : undefined,
      diametroMax: diametroMax ? parseFloat(diametroMax) : undefined,
      altezzaMin: altezzaMin ? parseFloat(altezzaMin) : undefined,
      altezzaMax: altezzaMax ? parseFloat(altezzaMax) : undefined,
      prezzoMin: prezzoMin ? parseFloat(prezzoMin) : undefined,
      prezzoMax: prezzoMax ? parseFloat(prezzoMax) : undefined,
      coloreRgb: coloreRgb || undefined,
      coloreTolleranza: coloreTolleranza ? parseFloat(coloreTolleranza) : undefined,
      codiceLinea: codiceLinea ? codiceLinea.split(',').filter(Boolean) : undefined,
      codiceListino,
    });
  }

  /** Filtri sidebar (famiglie/raccolte con conteggi). */
  @Get('facets')
  async getFacets(@Req() req: AuthenticatedRequest) {
    return this.integrazione.getCatalogoFacets(await this.listinoDi(req));
  }

  /** Ricerca semantica: frase in linguaggio naturale → articoli per similarità. */
  @Post('ricerca')
  async ricercaSemantica(@Body('q') q: string, @Query('k') k?: string, @Req() req?: AuthenticatedRequest) {
    return this.integrazione.searchSemantica(q ?? '', k ? parseInt(k, 10) : 24, await this.listinoDi(req));
  }

  /** Ricerca per immagine: foto del cliente → attributi (Gemini Vision) → articoli simili. */
  @Post('ricerca-immagine')
  @UseInterceptors(FileInterceptor('file'))
  async ricercaImmagine(@UploadedFile() file: Express.Multer.File, @Query('k') k?: string, @Req() req?: AuthenticatedRequest) {
    if (!file) throw new BadRequestException('Nessuna immagine caricata.');
    if (!file.mimetype?.startsWith('image/')) throw new BadRequestException('Il file deve essere un\'immagine.');
    if (file.size > 10 * 1024 * 1024) throw new BadRequestException('Immagine troppo grande (max 10MB).');
    return this.integrazione.searchByImage(file.buffer, file.mimetype, k ? parseInt(k, 10) : 24, await this.listinoDi(req));
  }

  @Get(':codiceLinea')
  async getArticoloCliente(@Param('codiceLinea') codiceLinea: string, @Req() req: AuthenticatedRequest) {
    const art = await this.integrazione.getArticolo(codiceLinea).catch(() => null);
    if (!art || art.stato !== 'attivo' || !art.configurato) {
      throw new NotFoundException('catalogo.articolo_non_trovato');
    }
    if (art.famiglia?.stato && art.famiglia.stato !== 'ATTIVO') {
      throw new NotFoundException('catalogo.articolo_non_trovato');
    }
    const { promptAi, wizardStepTesti, ...pubblico } = art;
    void promptAi; void wizardStepTesti;
    const variantiAttive = pubblico.varianti.filter((v: any) => v.stato === 'attivo');
    const codiceListino = await this.integrazione.codiceListinoCliente(req.user.id);
    const maxRaccSconto = Math.max(0, ...pubblico.raccolte.map((r: any) => r.sconto ?? 0));
    const variantiConPrezzi = await Promise.all(
      variantiAttive.map(async (v: any) => {
        let prezzo = null;
        if (codiceListino) {
          prezzo = await this.integrazione.getPrezzo(codiceListino, v.codice, maxRaccSconto > 0 ? maxRaccSconto : undefined);
        }
        return { ...v, prezzo };
      }),
    );
    void this.events.track('articolo.view', { entita: 'articolo', entitaId: codiceLinea, dettagli: { nome: pubblico.nome } });
    return { ...pubblico, varianti: variantiConPrezzi, variantiCount: variantiConPrezzi.length };
  }

  @Get(':codiceLinea/correlati')
  async getCorrelati(@Param('codiceLinea') codiceLinea: string, @Req() req: AuthenticatedRequest) {
    return this.integrazione.getCorrelati(codiceLinea, req.user.id);
  }
}
