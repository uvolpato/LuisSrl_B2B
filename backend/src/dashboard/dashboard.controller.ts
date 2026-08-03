import { BadRequestException, Controller, Get, NotFoundException, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import type { AuthenticatedRequest } from '../auth/guards/authenticated.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrazioneService } from '../integrazione/integrazione.service';
import { DashboardService } from './dashboard.service';

/** Box di suggerimento della dashboard cliente (engine deterministico + cache). */
@Controller('dashboard')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('customer', 'admin')
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly prisma: PrismaService,
    private readonly integrazione: IntegrazioneService,
  ) {}

  /** Box attivi del cliente. Gli admin possono passare ?clienteId= (anteprima). */
  @Get('suggerimenti')
  async suggerimenti(@Query('clienteId') clienteId?: string, @Req() req?: AuthenticatedRequest) {
    const customerId =
      req!.user.userType === 'admin' && clienteId
        ? parseInt(clienteId, 10)
        : req!.user.userType === 'admin'
          ? null
          : req!.user.id;
    if (!customerId || Number.isNaN(customerId)) {
      throw new BadRequestException('dashboard.cliente_richiesto');
    }
    const codiceListino = await this.listinoDi(customerId);
    return this.dashboard.getSuggerimenti(customerId, codiceListino);
  }

  /** Rigenerazione forzata (admin): un cliente specifico (?clienteId=) oppure tutti. */
  @Post('suggerimenti/rigenera')
  @Roles('admin')
  async rigenera(@Query('clienteId') clienteId?: string) {
    if (clienteId) {
      const id = parseInt(clienteId, 10);
      if (Number.isNaN(id)) throw new BadRequestException('dashboard.cliente_non_valido');
      const customer = await this.prisma.customer.findUnique({ where: { id } });
      if (!customer) throw new NotFoundException('dashboard.cliente_inesistente');
      return this.dashboard.rigeneraCliente(id, await this.listinoDi(id));
    }
    await this.dashboard.rigeneraTutti();
    return { esito: 'ok', rigenerati: 'tutti' };
  }

  private async listinoDi(customerId: number): Promise<string | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { codiceListino: true },
    });
    if (customer?.codiceListino) return customer.codiceListino;
    const fallback = await this.integrazione.getFirstListino();
    return fallback?.codice_listino ?? 'LIS1';
  }
}
