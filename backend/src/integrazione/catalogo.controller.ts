import { Controller, Get, NotFoundException, Param, Req, UseGuards } from '@nestjs/common';
import { IntegrazioneService } from './integrazione.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import type { AuthenticatedRequest } from '../auth/guards/authenticated.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

/** Catalogo lato cliente: articoli configurati e attivi, prezzi IVA esclusa. */
@Controller('catalogo')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('customer', 'admin')
export class CatalogoController {
  constructor(
    private readonly integrazione: IntegrazioneService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getCatalogo() {
    return this.integrazione.getCatalogoCliente();
  }

  @Get(':codiceLinea')
  async getArticoloCliente(@Param('codiceLinea') codiceLinea: string, @Req() req: AuthenticatedRequest) {
    const art = await this.integrazione.getArticolo(codiceLinea).catch(() => null);
    if (!art || art.stato !== 'attivo' || !art.configurato) {
      throw new NotFoundException('catalogo.articolo_non_trovato');
    }
    if (art.famiglia?.stato && art.famiglia.stato !== 'ATTIVO') {
      throw new NotFoundException('catalogo.articolo_non_trovato');
    }
    const { promptAi, wizardStepTesti, ...pubblico } = art;
    void promptAi; void wizardStepTesti;
    const variantiAttive = pubblico.varianti.filter((v: any) => v.stato === 'attivo');
    const customer = await this.prisma.customer.findUnique({ where: { id: req.user.id } });
    let codiceListino = customer?.codiceListino;
    if (!codiceListino) {
      const fallback = await this.integrazione.getFirstListino();
      codiceListino = fallback?.codice_listino ?? null;
    }
    const maxRaccSconto = Math.max(0, ...pubblico.raccolte.map((r: any) => r.sconto ?? 0));
    const variantiConPrezzi = await Promise.all(
      variantiAttive.map(async (v: any) => {
        let prezzo = null;
        if (codiceListino) {
          prezzo = await this.integrazione.getPrezzo(codiceListino, v.codice, maxRaccSconto > 0 ? maxRaccSconto : undefined);
        }
        return { ...v, prezzo };
      }),
    );
    return { ...pubblico, varianti: variantiConPrezzi, variantiCount: variantiConPrezzi.length };
  }
}
