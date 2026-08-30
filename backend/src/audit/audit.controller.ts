import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';
import { AuditService } from './audit.service';

@Controller('admin/audit')
@UseGuards(AuthenticatedGuard, PermissionsGuard)
@RequirePermission('admin.anomalie.view')
export class AuditController {
  constructor(private readonly svc: AuditService) {}

  @Get('stats')
  getStats() { return this.svc.getStats(); }

  @Get('entity/:entity/:entityId')
  getTimeline(@Param('entity') entity: string, @Param('entityId') entityId: string) {
    return this.svc.findByEntity(entity, entityId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(Number(id)); }

  @Get()
  findAll(
    @Query('categoria') categoria?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.findAll(
      Number(page) || 1,
      Math.min(Number(limit) || 50, 200),
      categoria,
      dateFrom,
      dateTo,
      search,
    );
  }
}
