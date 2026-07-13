import { Controller, Get, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { OrdiniService } from './ordini.service';

@Controller('ordini')
@UseGuards(AuthenticatedGuard)
export class OrdiniController {
  constructor(private readonly svc: OrdiniService) {}

  @Get()
  async getMieiOrdini(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('year') year?: string,
  ) {
    if (req.user?.userType !== 'customer') throw new BadRequestException('Utente senza profilo cliente');
    return this.svc.getMieiOrdini(req.user.id, search, Number(page) || 1,
      Math.min(Number(limit) || 50, 200), sortBy, sortDir, year);
  }
}
