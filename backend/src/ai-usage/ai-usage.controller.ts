import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AiUsageService } from './ai-usage.service';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

/** Dashboard costi AI (solo admin). */
@Controller('admin/ai-usage')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('admin')
export class AiUsageController {
  constructor(private readonly aiUsage: AiUsageService) {}

  @Get()
  summary(@Query('days') days?: string) {
    const d = days ? parseInt(days, 10) : 30;
    return this.aiUsage.summary(Math.min(Math.max(d, 1), 365));
  }
}
