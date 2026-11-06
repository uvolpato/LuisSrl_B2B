import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsEmail, IsIn, IsOptional } from 'class-validator';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import type { AuthenticatedRequest } from '../auth/guards/authenticated.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';
import { AdminLeadsService } from './admin-leads.service';
import { LeadsService } from './leads.service';
import { AzioniLeadService } from './azioni.service';
import { AZIONI, type Azione } from './azioni';

class AzioneDto {
  @IsIn(AZIONI)
  azione!: Azione;
}

class ReinviaDto {
  @IsIn(['conferma', 'shop'])
  tipo!: 'conferma' | 'shop';
}

class EmailAccessoDto {
  /** null / assente = automatica (quella di Integra, poi quella della richiesta). */
  @IsOptional()
  @IsEmail()
  email?: string | null;
}

/** Area admin "Richieste accesso": stessi permessi della gestione clienti. */
@Controller('admin/leads')
@UseGuards(AuthenticatedGuard, PermissionsGuard)
@RequirePermission('vendite.clienti.view')
export class AdminLeadsController {
  constructor(
    private readonly leads: AdminLeadsService,
    private readonly azioni: AzioniLeadService,
    private readonly invii: LeadsService,
  ) {}

  @Get()
  elenco(
    @Query('stato') stato?: string,
    @Query('verdetto') verdetto?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('sort') sort?: string,
    @Query('dir') dir?: string,
  ) {
    return this.leads.elenco({
      stato,
      verdetto,
      q,
      page: Number(page) || 1,
      sort,
      dir,
    });
  }

  /** Contatore per il badge del menu. */
  @Get('conteggio')
  async conteggio() {
    return { daDecidere: (await this.leads.kpi()).daDecidere };
  }

  @Get(':id')
  dettaglio(@Param('id', ParseIntPipe) id: number) {
    return this.leads.dettaglio(id);
  }

  /** Stessa transizione atomica dei pulsanti della mail; l'evento registra l'admin. */
  @Post(':id/azione')
  @RequirePermission('vendite.clienti.edit')
  async azione(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AzioneDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const esito = await this.azioni.applica(id, dto.azione, {
      origine: 'admin',
      adminId: req.user.id,
      ip: req.ip ?? null,
    });
    if (esito.tipo === 'errore')
      return { esito: esito.tipo, motivo: esito.motivo };
    return {
      esito: esito.tipo,
      stato: esito.lead.stato,
      export: esito.tipo === 'eseguita' ? (esito.export ?? null) : null,
      inIntegra: esito.tipo === 'eseguita' ? !!esito.inIntegra : false,
      verificaIntegra:
        esito.tipo === 'eseguita' ? (esito.verificaIntegra ?? null) : null,
    };
  }

  /** Sceglie l'email di accesso del cliente (null = automatica). */
  @Post(':id/email-accesso')
  @RequirePermission('vendite.clienti.edit')
  emailAccesso(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EmailAccessoDto,
  ) {
    return this.leads.setEmailAccesso(id, dto.email ?? null);
  }

  /** Rigenera il file anagrafica del cliente collegato, con codice, per aggiornarlo in Integra. */
  @Post(':id/riesporta')
  @RequirePermission('vendite.clienti.edit')
  riesporta(@Param('id', ParseIntPipe) id: number) {
    return this.leads.riesporta(id);
  }

  /** Reinvia a mano la conferma al richiedente o la segnalazione a shop@. */
  @Post(':id/reinvia')
  @RequirePermission('vendite.clienti.edit')
  reinvia(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReinviaDto,
  ) {
    return this.invii.reinvia(id, dto.tipo);
  }

  /** Ri-esegue l'indagine AI (es. dopo un errore) e aggiorna report + verdetto + sede. */
  @Post(':id/indagine')
  @RequirePermission('vendite.clienti.edit')
  async indagine(@Param('id', ParseIntPipe) id: number) {
    const report = await this.invii.reindaga(id);
    return { esito: report ? 'ok' : 'errore', errore: report?.errore ?? null };
  }

  /** Eliminazione definitiva della richiesta (solo superuser o admin con permesso edit). */
  @Delete(':id')
  @RequirePermission('vendite.clienti.edit')
  async elimina(@Param('id', ParseIntPipe) id: number) {
    await this.leads.elimina(id);
    return { esito: 'eliminata' };
  }
}
