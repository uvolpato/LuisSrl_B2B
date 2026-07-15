import { Controller, Get, Query, Res, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import sharp from 'sharp';

const ASSETS_BASE_DIR = path.resolve(
  process.env.ASSETS_BASE_DIR || path.join(process.cwd(), '..', 'frontend', 'public', 'images'),
);
const CACHE_DIR = path.join(ASSETS_BASE_DIR, '.cache');

// Larghezze consentite (snap alla piu' vicina): evita cache infinita.
const ALLOWED_WIDTHS = [200, 400, 800, 1200, 1600];

function snapWidth(w: number): number {
  return ALLOWED_WIDTHS.reduce((best, cur) =>
    Math.abs(cur - w) < Math.abs(best - w) ? cur : best,
  );
}

/**
 * Ridimensionamento immagini on-the-fly con cache su disco (WebP).
 * Pubblico (come i file statici serviti da Caddy). Esempio:
 *   /api/img?p=linea_ARGO_NOCCIOLA/xxx.jpg&w=200
 */
@Controller('img')
export class ImgController {
  @Get()
  async resize(@Query('p') p: string, @Query('w') wRaw: string, @Res() res: Response) {
    if (!p) throw new BadRequestException('parametro p mancante');
    // Anti path-traversal: niente '..', percorso deve restare dentro la base.
    const rel = p.replace(/^\/+/, '');
    const srcAbs = path.resolve(ASSETS_BASE_DIR, rel);
    if (!srcAbs.startsWith(ASSETS_BASE_DIR + path.sep) || rel.includes('..')) {
      throw new BadRequestException('percorso non valido');
    }
    if (!fs.existsSync(srcAbs)) {
      res.status(404).end();
      return;
    }

    const w = snapWidth(Math.max(50, Math.min(2000, Number(wRaw) || 400)));
    const cacheAbs = path.join(CACHE_DIR, `${rel}@${w}.webp`);

    try {
      if (!fs.existsSync(cacheAbs)) {
        await fsp.mkdir(path.dirname(cacheAbs), { recursive: true });
        await sharp(srcAbs)
          .rotate() // rispetta l'orientamento EXIF
          .resize({ width: w, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(cacheAbs);
      }
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      fs.createReadStream(cacheAbs).pipe(res);
    } catch {
      // In caso di errore sharp, ripiega sull'originale
      res.sendFile(srcAbs);
    }
  }
}
