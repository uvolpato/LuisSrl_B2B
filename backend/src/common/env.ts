import { resolve, join } from 'path';

/** Configurazione condivisa letta da variabili d'ambiente (un solo punto di verità). */

/** Cartella delle immagini su disco (ASSETS_BASE_DIR o default ../frontend/public/images). */
export const ASSETS_BASE_DIR = resolve(
  process.env.ASSETS_BASE_DIR || join(process.cwd(), '..', 'frontend', 'public', 'images'),
);

/** URL pubblico delle immagini (ASSETS_PUBLIC_URL o /images). */
export const ASSETS_PUBLIC_URL = process.env.ASSETS_PUBLIC_URL || '/images';

/** Origini frontend ammesse da CORS e WebSocket (separate da virgola). */
export const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000').split(',');
