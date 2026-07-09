import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { CarrelloService } from './carrello.service';

@Controller('carrello')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('customer')
export class CarrelloController {
  constructor(private readonly carrello: CarrelloService) {}

  @Get()
  getCart(@Req() req: any) {
    return this.carrello.getCart(req.user.id);
  }

  @Get('count')
  getCount(@Req() req: any) {
    return this.carrello.getCount(req.user.id).then((c) => ({ count: c }));
  }

  @Post()
  addItem(@Req() req: any, @Body() dto: { varianteCodice: string; quantita: number }) {
    return this.carrello.addItem(req.user.id, dto.varianteCodice, dto.quantita);
  }

  @Patch(':varianteCodice/qty')
  updateQty(@Req() req: any, @Param('varianteCodice') varianteCodice: string, @Body() dto: { quantita: number }) {
    return this.carrello.updateQty(req.user.id, varianteCodice, dto.quantita);
  }

  @Patch(':varianteCodice/salva')
  toggleSaved(@Req() req: any, @Param('varianteCodice') varianteCodice: string) {
    return this.carrello.toggleSaved(req.user.id, varianteCodice);
  }

  @Delete(':varianteCodice')
  removeItem(@Req() req: any, @Param('varianteCodice') varianteCodice: string) {
    return this.carrello.removeItem(req.user.id, varianteCodice);
  }
}
