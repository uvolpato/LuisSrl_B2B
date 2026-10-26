import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Req, Res } from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import type { Request, Response } from 'express';
import { CataloghiService } from './cataloghi.service';

/** Endpoint pubblici (niente sessione: il token opaco è l'autorizzazione). */
@Controller('cataloghi')
export class CataloghiPublicController {
  constructor(private readonly service: CataloghiService) {}

  @Get(':token')
  landing(@Param('token') token: string, @Req() req: Request) {
    return this.service.landing(token, req.ip ?? null, req.headers['user-agent'] ?? null);
  }

  /** Webhook Brevo: il segreto nell'URL è l'autorizzazione (Brevo non manda header custom). */
  @Post('webhook/:secret')
  webhook(@Param('secret') secret: string, @Body() body: unknown) {
    return this.service.webhook(secret, body);
  }

  @Get(':token/:catalogoId/pdf')
  async pdf(
    @Param('token') token: string,
    @Param('catalogoId', ParseIntPipe) catalogoId: number,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { pdfPath, nome } = await this.service.pdf(token, catalogoId, req.ip ?? null, req.headers['user-agent'] ?? null);
    if (!existsSync(pdfPath)) throw new NotFoundException('cataloghi.pdf_non_trovato');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="catalogo.pdf"; filename*=UTF-8''${encodeURIComponent(`${nome}.pdf`)}`);
    res.setHeader('Cache-Control', 'no-store');
    createReadStream(pdfPath).pipe(res);
  }
}
