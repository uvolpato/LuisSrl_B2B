import { Controller, Get, UseGuards } from '@nestjs/common';
import { IntegrazioneService } from './integrazione.service';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

/** Famiglie lato cliente: card ordinate, step intermedio prima del catalogo. */
@Controller('famiglie')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('customer', 'admin')
export class FamiglieController {
  constructor(private readonly integrazione: IntegrazioneService) {}

  @Get()
  getFamiglie() {
    return this.integrazione.getFamiglieCliente();
  }
}
