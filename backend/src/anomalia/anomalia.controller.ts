import { Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { AnomaliaService } from './anomalia.service';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';

@Controller('admin/anomalie')
@UseGuards(AuthenticatedGuard, PermissionsGuard)
@RequirePermission('admin.anomalie.view')
export class AnomaliaController {
  constructor(private readonly anomalia: AnomaliaService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tipo') tipo?: string,
    @Query('gravita') gravita?: string,
    @Query('risolto') risolto?: string,
  ) {
    return this.anomalia.findAll(
      page != null ? Number(page) : 1,
      limit != null ? Number(limit) : 50,
      tipo,
      gravita,
      risolto !== undefined ? risolto === 'true' : undefined,
    );
  }

  @Get('stats')
  getStats() {
    return this.anomalia.getStats();
  }

  @Patch(':id/risolvi')
  @RequirePermission('admin.anomalie.edit')
  risolvi(@Param('id', ParseIntPipe) id: number) {
    return this.anomalia.risolvi(id);
  }
}
