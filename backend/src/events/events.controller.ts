import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

/** Ingestione eventi comportamentali dal browser del cliente (beacon). */
@Controller('eventi')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('customer', 'admin')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  ingest(@Body('eventi') eventi: { tipo: string; entita?: string; entitaId?: string; dettagli?: unknown }[]) {
    return this.events.trackBatch(eventi ?? []);
  }
}
