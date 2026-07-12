import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import type { AuthenticatedRequest } from '../auth/guards/authenticated.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

@Controller('checkout')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('customer', 'admin')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Get('dati')
  getDati(@Req() req: AuthenticatedRequest) {
    return this.checkout.getDatiCheckout(req.user.id);
  }

  @Post('conferma')
  conferma(
    @Req() req: AuthenticatedRequest,
    @Body() dto: {
      indirizzoSpedizioneId?: number;
      codicePorto?: string;
      codiceSpedizione?: string;
      codiceVettore?: string;
      codicePagamento?: string;
      notaSpedizione?: string;
      notaOrdine?: string;
    },
  ) {
    return this.checkout.confermaOrdine(req.user.id, dto);
  }
}
