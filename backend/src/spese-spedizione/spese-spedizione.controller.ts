import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { SpeseSpedizioneService } from './spese-spedizione.service';
import { CreateTariffaDto } from './dto/create-tariffa.dto';
import { UpdateTariffaDto } from './dto/update-tariffa.dto';

@Controller('admin/tariffe-spedizione')
export class SpeseSpedizioneController {
  private readonly logger = new Logger(SpeseSpedizioneController.name);
  constructor(private readonly service: SpeseSpedizioneService) {}

  @Get()
  async findAll() {
    const list = await this.service.findAll();
    const serialized = list.map((t) => this.service.serialize(t));
    return {
      data: serialized,
      meta: {
        totale: list.length,
        ok: list.filter((t) => t.stato === 'ok').length,
        pausa: list.filter((t) => t.stato === 'pausa').length,
        configura: list.filter((t) => t.stato === 'configura').length,
        nazioni: new Set(list.filter((t) => !this.service.isZona(t.nazione) && !t.regione).map((t) => t.nazione)).size,
        regioni: list.filter((t) => t.regione !== null).length,
        zone: list.filter((t) => this.service.isZona(t.nazione)).length,
        euCount: this.service.getEuCount(),
      },
    };
  }

  @Get('riferimenti')
  getRiferimenti() {
    return {
      nazioni: this.service.getNazioni(),
      regioniIT: this.service.getRegioniIT(),
      zoneKeys: this.service.getZoneKeys(),
      euCount: this.service.getEuCount(),
    };
  }

  @Get('risolvi')
  async risolvi(
    @Query('nazione') nazione: string,
    @Query('regione') regione?: string,
    @Query('importo') importo?: string,
    @Query('sconto') sconto?: string,
  ) {
    return this.service.risolvi(
      nazione,
      regione || undefined,
      importo != null ? Number(importo) : undefined,
      sconto != null ? Number(sconto) : undefined,
    );
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    const t = await this.service.findById(id);
    if (!t) throw new NotFoundException('Tariffa non trovata');
    return this.service.serialize(t);
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateTariffaDto) {
    try {
      const t = await this.service.create(dto);
      this.logger.log('create OK, returning');
      return this.service.serialize(t);
    } catch (e) {
      this.logger.error('create FAIL', e instanceof Error ? e.message : e);
      throw e;
    }
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTariffaDto) {
    const t = await this.service.update(id, dto);
    return this.service.serialize(t);
  }

  @Patch(':id/stato')
  async toggleStato(@Param('id', ParseIntPipe) id: number) {
    const t = await this.service.toggleStato(id);
    return this.service.serialize(t);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.service.delete(id);
  }
}

