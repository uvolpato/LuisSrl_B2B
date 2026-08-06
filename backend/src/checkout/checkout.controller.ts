import { Controller, Get, Post, Body, Req, UseGuards, Query } from '@nestjs/common';
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

  @Get('spedizione')
  getSpedizione(
    @Req() req: AuthenticatedRequest,
    @Query('provincia') provincia: string,
    @Query('imponibile') imponibile: string,
  ) {
    return this.checkout.calcolaSpedizione(
      req.user.id,
      provincia,
      imponibile != null ? Number(imponibile) : 0,
    );
  }

  @Post('indirizzo')
  salvaIndirizzo(
    @Req() req: AuthenticatedRequest,
    @Body() dto: {
      ragioneSociale?: string;
      indirizzo: string;
      cap: string;
      citta: string;
      provincia?: string;
      abituale?: boolean;
    },
  ) {
    return this.checkout.salvaIndirizzo(req.user.id, dto);
  }

  @Post('conferma')
  conferma(
    @Req() req: AuthenticatedRequest,
    @Body() dto: {
      modalitaConsegna?: string;
      indirizzoSpedizioneId?: number;
      nuovoIndirizzo?: { ragioneSociale?: string; indirizzo: string; cap: string; citta: string; provincia?: string; abituale?: boolean };
      codicePorto?: string;
      codiceSpedizione?: string;
      codiceVettore?: string;
      codicePagamento?: string;
      notaSpedizione?: string;
      notaOrdine?: string;
    },
  ) {
    return this.checkout.confermaOrdine(req.user.id, dto as any);
  }
}

@Controller('config')
export class ConfigController {
  @Get('banca-luis')
  getBanca() {
    return {
      intestatario: process.env.LUIS_BANK_INTESTATARIO ?? 'LUIS S.r.l.',
      nome: process.env.LUIS_BANK_NOME ?? 'Intesa Sanpaolo',
      iban: process.env.LUIS_BANK_IBAN ?? 'IT60X0542811101000000123456',
      swift: process.env.LUIS_BANK_SWIFT ?? 'BCITITMM',
    };
  }
}
