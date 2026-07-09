import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { IntegrazioneService } from './integrazione.service';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

/** Catalogo lato cliente: articoli configurati e attivi, prezzi IVA esclusa (arrivano in Fase C). */
@Controller('catalogo')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('customer', 'admin')
export class CatalogoController {
  constructor(private readonly integrazione: IntegrazioneService) {}

  @Get()
  getCatalogo() {
    return this.integrazione.getCatalogoCliente();
  }

  @Get(':codiceLinea')
  async getArticoloCliente(@Param('codiceLinea') codiceLinea: string) {
    const art = await this.integrazione.getArticolo(codiceLinea).catch(() => null);
    // Visibile al cliente solo se configurato e attivo; niente campi admin
    if (!art || art.stato !== 'attivo' || !art.configurato) {
      throw new NotFoundException('catalogo.articolo_non_trovato');
    }
    // Esclude gli articoli di famiglie disattivate (nascoste)
    if (art.famiglia?.stato && art.famiglia.stato !== 'ATTIVO') {
      throw new NotFoundException('catalogo.articolo_non_trovato');
    }
    const { promptAi, wizardStepTesti, ...pubblico } = art;
    void promptAi; void wizardStepTesti;
    const variantiAttive = pubblico.varianti.filter((v: any) => v.stato === 'attivo');
    return { ...pubblico, varianti: variantiAttive, variantiCount: variantiAttive.length };
  }
}
