import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IntegrazioneService } from './integrazione.service';
import { SyncService, SyncResult } from './sync.service';
import { SyncManagerService } from './sync-manager.service';
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
    private readonly syncManager: SyncManagerService,
  ) {}

  @Post('sync')
  @HttpCode(202)
  async syncIntegra(): Promise<{ status: string }> {
    this.syncService.sync().catch((err) =>
      this.syncService['logger'].error(`Sync async fallito: ${err instanceof Error ? err.message : err}`)
    );
    return { status: 'started' };
  }

  @Post('sync/clienti')
  @HttpCode(202)
  async syncClienti(): Promise<{ status: string }> {
    this.syncService.syncClienti().catch((err) =>
      this.syncService['logger'].error(`Sync clienti fallito: ${err instanceof Error ? err.message : err}`)
    );
    return { status: 'started' };
  }

  @Post('sync/ordini')
  @HttpCode(202)
  async syncOrdini(): Promise<{ status: string }> {
    this.syncService.syncOrdini().catch((err) =>
      this.syncService['logger'].error(`Sync ordini fallito: ${err instanceof Error ? err.message : err}`)
    );
    return { status: 'started' };
  }

  @Post('sync/listini')
  @HttpCode(202)
  async syncListini(): Promise<{ status: string }> {
    this.syncService.syncListini().catch((err) =>
      this.syncService['logger'].error(`Sync listini fallito: ${err instanceof Error ? err.message : err}`)
    );
    return { status: 'started' };
  }

  @Post('sync/lookup')
  @HttpCode(202)
  async syncLookup(): Promise<{ status: string }> {
    this.syncService.syncLookup().catch((err) =>
      this.syncService['logger'].error(`Sync lookup fallito: ${err instanceof Error ? err.message : err}`)
    );
    return { status: 'started' };
  }

  @Post('sync/giacenza')
  @HttpCode(202)
  async syncGiacenza(): Promise<{ status: string }> {
    this.syncService.syncGiacenza().catch((err) =>
      this.syncService['logger'].error(`Sync giacenze fallito: ${err instanceof Error ? err.message : err}`)
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
    @Body() body: { prompt: string; n?: number; aspectRatio?: string; temperature?: number; seed?: number; aggiungiColore?: boolean; aggiungiVariante?: boolean; promptTemplateId?: number | null },
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

  // ── PromptTemplate CRUD ──

  @Get('prompt-templates')
  async getPromptTemplates() {
    return this.integrazione.getPromptTemplates();
  }

  @Get('prompt-templates/:id')
  async getPromptTemplate(@Param('id') id: string) {
    return this.integrazione.getPromptTemplate(Number(id));
  }

  @Post('prompt-templates')
  async createPromptTemplate(@Body() body: { tipo: string; titolo: string; prompt: string; tags?: string; ordinamento?: number }) {
    return this.integrazione.createPromptTemplate(body);
  }

  @Patch('prompt-templates/:id')
  async updatePromptTemplate(@Param('id') id: string, @Body() body: { tipo?: string; titolo?: string; prompt?: string; tags?: string; ordinamento?: number }) {
    return this.integrazione.updatePromptTemplate(Number(id), body);
  }

  @Delete('prompt-templates/:id')
  async deletePromptTemplate(@Param('id') id: string) {
    return this.integrazione.deletePromptTemplate(Number(id));
  }

  // ── Clienti (import da Integra) ──

  @Get('listini')
  async getListini() {
    return this.integrazione.getListini();
  }

  @Get('listini/:codice/righe')
  async searchListiniRighe(
    @Param('codice') codice: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @Query('dir') dir?: 'asc' | 'desc',
  ) {
    return this.integrazione.searchListiniRighe(
      codice,
      search,
      Number(page) || 1,
      Math.min(Number(limit) || 50, 200),
      sort,
      dir,
    );
  }

  @Get('clienti')
  async searchClienti(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @Query('dir') dir?: 'asc' | 'desc',
  ) {
    return this.integrazione.searchClienti(
      search,
      Number(page) || 1,
      Math.min(Number(limit) || 50, 200),
      sort,
      dir,
    );
  }

  @Post('clienti/importa')
  async importaClienti(@Body() body: { codici: string[] }) {
    return this.integrazione.importaClienti(body.codici || []);
  }

  @Post('clienti/:codice/sync-ordini')
  @HttpCode(200)
  async syncOrdiniCliente(@Param('codice') codice: string) {
    return this.integrazione.syncOrdiniCliente(codice);
  }

  // ── Sync Config Manager ──

  @Get('sync-config')
  async getSyncConfigs() {
    return this.syncManager.getConfigs();
  }

  @Put('sync-config/:tipo')
  async updateSyncConfig(
    @Param('tipo') tipo: string,
    @Body() body: { cron_expression?: string; attivo?: boolean; solo_manuale?: boolean },
  ) {
    return this.syncManager.updateConfig(tipo, body);
  }

  @Post('sync-config/:tipo/trigger')
  @HttpCode(200)
  async triggerSync(@Param('tipo') tipo: string) {
    return this.syncManager.runSync(tipo, true);
  }

  @Get('sync-logs')
  async getSyncLogs(@Query('tipo') tipo?: string, @Query('limit') limit?: string) {
    return this.syncManager.getLogs(tipo || undefined, Number(limit) || 50);
  }

  @Get('sync-config/:tipo/next-run')
  async getNextRun(@Param('tipo') tipo: string) {
    const next = await this.syncManager.nextRunTime(tipo);
    return { next };
  }
}
