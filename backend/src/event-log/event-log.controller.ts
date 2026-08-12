import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';
import { EventLogService } from './event-log.service';

@Controller('admin/event-log')
@UseGuards(AuthenticatedGuard, PermissionsGuard)
@RequirePermission('admin.anomalie.view')
export class EventLogController {
  constructor(private readonly svc: EventLogService) {}

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
    @Query('eventType') eventType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.findAll(
      Number(page) || 1,
      Math.min(Number(limit) || 50, 200),
      eventType,
      dateFrom,
      dateTo,
      search,
    );
  }
}
