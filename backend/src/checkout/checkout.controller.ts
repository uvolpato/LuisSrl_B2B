import { Controller, Get, Post, Put, Patch, Delete, Body, Req, UseGuards, Query, Param, ParseIntPipe } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import type { AuthenticatedRequest } from '../auth/guards/authenticated.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

@Controller('checkout')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('customer', 'admin')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Get('soglia')
  getSoglia(@Req() req: AuthenticatedRequest) {
    return this.checkout.getSogliaDefault(req.user.id);
  }

  @Get('dati')
  getDati(@Req() req: AuthenticatedRequest) {
    return this.checkout.getDatiCheckout(req.user.id);
  }

  @Post('validate-coupon')
  validateCoupon(@Req() req: AuthenticatedRequest, @Body() body: { code: string; subtotale: number }) {
    return this.checkout.validateCoupon(body.code, body.subtotale);
  }

  @Get('spedizione')
  getSpedizione(
    @Req() req: AuthenticatedRequest,
    @Query('provincia') provincia: string,
    @Query('imponibile') imponibile: string,
    @Query('sconto') sconto?: string,
  ) {
    return this.checkout.calcolaSpedizione(
      req.user.id,
      provincia,
      imponibile != null ? Number(imponibile) : 0,
      sconto != null ? Number(sconto) : 0,
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

  @Put('indirizzo/:id')
  aggiornaIndirizzo(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: {
      indirizzo?: string;
      cap?: string;
      citta?: string;
      provincia?: string;
    },
  ) {
    return this.checkout.aggiornaIndirizzo(req.user.id, id, dto);
  }

  @Delete('indirizzo/:id')
  eliminaIndirizzo(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.checkout.eliminaIndirizzo(req.user.id, id);
  }

  @Patch('indirizzo/:id/predefinito')
  impostaPredefinito(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.checkout.impostaPredefinito(req.user.id, id);
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

