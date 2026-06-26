import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IntegrazioneService } from './integrazione.service';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('integrazione')
@UseGuards(AuthenticatedGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
export class IntegrazioneController {
  constructor(private readonly integrazione: IntegrazioneService) {}

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
    @Query('famigliaId') famigliaId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.integrazione.searchProdotti(
      search,
      famigliaId ? Number(famigliaId) : undefined,
      Number(page) || 1,
      Math.min(Number(limit) || 50, 200),
    );
  }

  @Post('importa')
  async importa(@Body() body: { codici: string[] }) {
    return this.integrazione.importaVarianti(body.codici || []);
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
    @UploadedFiles() files: any[],
    @Body('tipo') tipo?: string,
  ) {
    return this.integrazione.uploadImmagini(codiceLinea, files, tipo || 'CARICATA');
  }

  @Delete('articoli/:codiceLinea')
  async deleteArticolo(@Param('codiceLinea') codiceLinea: string) {
    return this.integrazione.deleteArticolo(codiceLinea);
  }
}
