import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IntegrazioneService } from './integrazione.service';
import { SyncService, SyncResult } from './sync.service';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('integrazione')
@UseGuards(AuthenticatedGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
export class IntegrazioneController {
  constructor(
    private readonly integrazione: IntegrazioneService,
    private readonly syncService: SyncService,
  ) {}

  @Post('sync')
  @HttpCode(202)
  async syncIntegra(): Promise<{ status: string }> {
    this.syncService.sync().catch((err) =>
      this.syncService['logger'].error(`Sync async fallito: ${err instanceof Error ? err.message : err}`)
    );
    return { status: 'started' };
  }

  @Get('sync/progress')
  async syncProgress() {
    return this.syncService.getProgress();
  }

  @Get('sync/status')
  async syncStatus() {
    return this.syncService.getStatus();
  }

  @Get('catalogo')
  async getCatalogo() {
    const [famiglie, linee, prodotti] = await Promise.all([
      this.integrazione.getFamiglie(),
      this.integrazione.getLinee(),
      this.integrazione.getProdotti(),
    ]);
    return { famiglie, linee, prodotti };
  }

  @Get('prodotti')
  async searchProdotti(
    @Query('search') search?: string,
    @Query('famiglia') famiglia?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.integrazione.searchProdotti(
      search,
      famiglia || undefined,
      Number(page) || 1,
      Math.min(Number(limit) || 50, 200),
    );
  }

  @Post('importa')
  async importa(@Body() body: { codici: string[] }) {
    return this.integrazione.importaVarianti(body.codici || []);
  }

  @Post('migrate-split')
  @HttpCode(200)
  async migrateSplit() {
    return this.integrazione.splitGroupedArticles();
  }

  @Post('undo-split')
  @HttpCode(200)
  async undoSplit() {
    return this.integrazione.undoSplit();
  }

  @Get('articoli')
  async getArticoli() {
    return this.integrazione.getArticoli();
  }

  @Get('mapping')
  getMapping() {
    return this.integrazione.getConfig();
  }

  @Patch('articoli/:codiceLinea/stato')
  async toggleStato(@Param('codiceLinea') codiceLinea: string) {
    return this.integrazione.toggleArticoloStato(codiceLinea);
  }

  @Post('articoli/:codiceLinea/configura')
  async configura(@Param('codiceLinea') codiceLinea: string) {
    return this.integrazione.configuraArticolo(codiceLinea);
  }

  @Post('articoli/:codiceLinea/immagini/:id/ambienta')
  async ambienta(
    @Param('codiceLinea') codiceLinea: string,
    @Param('id') id: string,
    @Body() body: { prompt: string; n?: number; aspectRatio?: string; temperature?: number; seed?: number },
  ) {
    return this.integrazione.ambientaImmagine(codiceLinea, Number(id), body);
  }

  @Post('articoli/:codiceLinea/descrizione/wizard')
  async wizardDescrizione(
    @Param('codiceLinea') codiceLinea: string,
    @Body() body: { stepTesti: { step: number; label: string; testo: string }[]; azione?: string; promptPersonalizzato?: string },
  ) {
    return this.integrazione.wizardDescrizione(codiceLinea, body);
  }

  @Post('articoli/:codiceLinea/immagini/ai/persisti')
  async persistAi(
    @Param('codiceLinea') codiceLinea: string,
    @Body() body: { generationId: string; indices: number[] },
  ) {
    return this.integrazione.persistAiImmagini(codiceLinea, body.generationId, body.indices ?? []);
  }

  @Get('articoli/:codiceLinea')
  async getArticolo(@Param('codiceLinea') codiceLinea: string) {
    return this.integrazione.getArticolo(codiceLinea);
  }

  @Put('articoli/:codiceLinea')
  async updateArticolo(
    @Param('codiceLinea') codiceLinea: string,
    @Body() body: any,
  ) {
    return this.integrazione.updateArticolo(codiceLinea, body);
  }

  @Post('articoli/:codiceLinea/immagini')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadImmagini(
    @Param('codiceLinea') codiceLinea: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('tipo') tipo?: string,
  ) {
    return this.integrazione.uploadImmagini(codiceLinea, files, tipo || 'CARICATA');
  }

  @Delete('articoli/:codiceLinea')
  async deleteArticolo(@Param('codiceLinea') codiceLinea: string) {
    return this.integrazione.deleteArticolo(codiceLinea);
  }
}
