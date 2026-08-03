import { Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { InsightService } from './insight.service';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';

/** Sintesi AI comportamentale del cliente (solo admin). */
@Controller('customers')
@UseGuards(AuthenticatedGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
export class InsightController {
  constructor(private readonly insight: InsightService) {}

  @Get(':id/insight')
  @RequirePermission('admin.users.view')
  latest(@Param('id', ParseIntPipe) id: number) {
    return this.insight.latest(id);
  }

  @Post(':id/insight/genera')
  @RequirePermission('admin.users.view')
  genera(@Param('id', ParseIntPipe) id: number) {
    return this.insight.generate(id);
  }

  @Get(':id/insight/simili')
  @RequirePermission('admin.users.view')
  simili(@Param('id', ParseIntPipe) id: number, @Query('k') k?: string) {
    return this.insight.simili(id, k ? parseInt(k, 10) : 5);
  }
}
