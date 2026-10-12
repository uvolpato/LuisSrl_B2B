import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadsService } from './leads.service';
import { AzioniLeadService, type EsitoAzione } from './azioni.service';
import { paginaAzione } from './pagina-azione';

/**
 * Richiesta accesso B2B dal sito vetrina. Pubblico (nessuna sessione).
 * IP reale: arriva in X-Forwarded-For dal server della vetrina e Express lo
 * risolve in req.ip (trust proxy 1). Il backend non e' esposto su internet.
 */
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leads: LeadsService,
    private readonly azioni: AzioniLeadService,
  ) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async crea(@Body() dto: CreateLeadDto, @Req() req: Request) {
    // Honeypot compilato = bot: risposta identica a un successo, nulla salvato.
    if (dto.sito?.trim()) return { ok: true };
    await this.leads.crea(dto, req.ip ?? null, req.get('user-agent') ?? null);
    return { ok: true };
  }

  /** Pulsante della mail: solo anteprima + bottone di conferma (nessuna modifica in GET). */
  @Get('azione')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async anteprimaAzione(
    @Query() q: Record<string, string>,
    @Res() res: Response,
  ) {
    const esito = await this.azioni.anteprima(q);
    this.invia(res, esito, {
      l: q.l ?? '',
      a: q.a ?? '',
      e: q.e ?? '',
      s: q.s ?? '',
    });
  }

  /** Conferma dalla pagina: il link firmato e' l'autorizzazione (esente da CSRF di sessione, vedi main.ts). */
  @Post('azione')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async eseguiAzione(
    @Body() body: Record<string, string>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const esito = await this.azioni.esegui(
      body,
      req.ip ?? null,
      req.get('user-agent') ?? null,
    );
    this.invia(res, esito);
  }

  private invia(
    res: Response,
    esito: EsitoAzione,
    form?: { l: string; a: string; e: string; s: string },
  ) {
    const status =
      esito.tipo === 'errore'
        ? { invalido: 403, scaduto: 410, inesistente: 404 }[esito.motivo]
        : esito.tipo === 'gia_fatta'
          ? 409
          : 200;
    res
      .status(status)
      .set({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex',
      })
      .send(paginaAzione(esito, form));
  }
}
