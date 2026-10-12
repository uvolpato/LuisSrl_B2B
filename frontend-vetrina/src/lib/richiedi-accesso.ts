'use server';

import { isIP } from 'node:net';
import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:3001';
const CAMPI = ['ragioneSociale', 'partitaIva', 'codiceFiscale', 'referente', 'tipoAttivita', 'email', 'telefono', 'citta', 'messaggio', 'sito'] as const;

export type EsitoRichiesta = 'ok' | 'troppe' | 'invalida' | 'errore';

/**
 * Inoltra la richiesta di accesso al backend dal server della vetrina (il browser non parla con l'API).
 * IP visitatore: primo valore di X-Forwarded-For. Dietro Caddy e' affidabile (Caddy lo sovrascrive);
 * con accesso diretto in intranet Next lo imposta dal socket solo se assente, quindi e' falsificabile
 * da un client interno (rischio accettato finche' la vetrina e' solo intranet).
 */
export async function inviaRichiestaAccesso(form: FormData): Promise<EsitoRichiesta> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim().replace(/^::ffff:/, '') ?? '';

  const body: Record<string, unknown> = { lingua: await getLocale(), privacy: form.get('privacy') === 'on' };
  for (const k of CAMPI) {
    const v = form.get(k);
    if (typeof v === 'string' && v.trim()) body[k] = v.trim();
  }

  try {
    const res = await fetch(`${BACKEND}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(isIP(ip) ? { 'X-Forwarded-For': ip } : {}),
        'User-Agent': h.get('user-agent')?.slice(0, 300) ?? '',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (res.ok) return 'ok';
    if (res.status === 429) return 'troppe';
    if (res.status === 400) return 'invalida';
    return 'errore';
  } catch {
    return 'errore';
  }
}
