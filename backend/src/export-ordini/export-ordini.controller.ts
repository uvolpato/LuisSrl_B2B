import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ExportOrdiniService } from './export-ordini.service';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('admin/export-ordini')
@UseGuards(AuthenticatedGuard, PermissionsGuard)
export class ExportOrdiniController {
  constructor(private readonly service: ExportOrdiniService) {}

  /** Anteprima: cosa uscirebbe adesso, senza scrivere niente. */
  @Get('anteprima')
  anteprima() {
    return this.service.esportaCoda(true);
  }

  /** Esegue l'export della coda. ?dryRun=1 equivale all'anteprima. */
  @Post('run')
  run(@Query('dryRun') dryRun?: string) {
    return this.service.esportaCoda(dryRun === '1' || dryRun === 'true');
  }
}
