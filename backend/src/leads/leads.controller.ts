import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadsService } from './leads.service';

/**
 * Richiesta accesso B2B dal sito vetrina. Pubblico (nessuna sessione).
 * IP reale: arriva in X-Forwarded-For dal server della vetrina e Express lo
 * risolve in req.ip (trust proxy 1). Il backend non e' esposto su internet.
 */
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async crea(@Body() dto: CreateLeadDto, @Req() req: Request) {
    // Honeypot compilato = bot: risposta identica a un successo, nulla salvato.
    if (dto.sito?.trim()) return { ok: true };
    await this.leads.crea(dto, req.ip ?? null, req.get('user-agent') ?? null);
    return { ok: true };
  }
}
