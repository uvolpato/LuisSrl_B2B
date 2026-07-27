import { Controller, Get, Param } from '@nestjs/common';
import { ProgettiService } from './progetti.service';

/** Vista pubblica in sola lettura di un progetto via token di condivisione. */
@Controller('progetti/pubblico')
export class ProgettiPublicController {
  constructor(private readonly progetti: ProgettiService) {}

  @Get(':token')
  get(@Param('token') token: string) {
    return this.progetti.getPublic(token);
  }
}
