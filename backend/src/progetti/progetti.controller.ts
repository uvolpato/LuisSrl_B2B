import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ProgettiService } from './progetti.service';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import type { AuthenticatedRequest } from '../auth/guards/authenticated.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

/** Progetti (liste di lavoro) del cliente. */
@Controller('progetti')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('customer', 'admin')
export class ProgettiController {
  constructor(private readonly progetti: ProgettiService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.progetti.list(req.user.id);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body('nome') nome: string, @Body('note') note?: string) {
    return this.progetti.create(req.user.id, nome, note);
  }

  @Get(':id')
  get(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.progetti.get(req.user.id, id);
  }

  @Patch(':id')
  update(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() body: { nome?: string; note?: string }) {
    return this.progetti.update(req.user.id, id, body);
  }

  @Delete(':id')
  remove(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.progetti.remove(req.user.id, id);
  }

  @Post(':id/items')
  addItem(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body('varianteCodice') varianteCodice: string, @Body('quantita') quantita: number) {
    return this.progetti.addItem(req.user.id, id, varianteCodice, quantita ?? 1);
  }

  @Patch(':id/items/:varianteCodice')
  updateItem(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Param('varianteCodice') varianteCodice: string, @Body('quantita') quantita: number) {
    return this.progetti.updateItem(req.user.id, id, varianteCodice, quantita);
  }

  @Delete(':id/items/:varianteCodice')
  removeItem(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Param('varianteCodice') varianteCodice: string) {
    return this.progetti.removeItem(req.user.id, id, varianteCodice);
  }

  @Post(':id/aggiungi-al-carrello')
  addToCart(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.progetti.addToCart(req.user.id, id);
  }
}
