import { createHmac, timingSafeEqual } from 'node:crypto';

/** Azioni dai pulsanti della mail lead (specifica-qualifica-lead.md §7, Fase 3). */
export const AZIONI = ['approva', 'verifica', 'scarta'] as const;
export type Azione = (typeof AZIONI)[number];

export const TTL_MS = 7 * 24 * 3600 * 1000;

/** Segreto dedicato; in mancanza ne deriva uno da SESSION_SECRET (obbligatorio all'avvio). */
export function segretoAzioni(): string {
  const dedicato = process.env.LEAD_ACTION_SECRET;
  if (dedicato) return dedicato;
  return createHmac('sha256', process.env.SESSION_SECRET ?? '')
    .update('lead-azioni')
    .digest('hex');
}

/** HMAC-SHA256 su id + azione + scadenza: il link stesso e' l'autorizzazione. */
export function firma(
  leadId: number,
  azione: Azione,
  scadenza: number,
  segreto: string,
): string {
  return createHmac('sha256', segreto)
    .update(`${leadId}.${azione}.${scadenza}`)
    .digest('hex');
}

export type EsitoToken =
  | { ok: true; leadId: number; azione: Azione }
  | { ok: false; motivo: 'invalido' | 'scaduto' };

/** Verifica parametri del link (valori grezzi dalla query/form). Confronto a tempo costante. */
export function verificaToken(
  p: { l?: unknown; a?: unknown; e?: unknown; s?: unknown },
  segreto: string,
  ora = Date.now(),
): EsitoToken {
  const leadId = Number(p.l);
  const scadenza = Number(p.e);
  const azione = p.a as Azione;
  const sig = typeof p.s === 'string' ? p.s : '';
  if (
    !Number.isInteger(leadId) ||
    leadId <= 0 ||
    !Number.isInteger(scadenza) ||
    !AZIONI.includes(azione) ||
    !/^[0-9a-f]{64}$/.test(sig)
  )
    return { ok: false, motivo: 'invalido' };
  const atteso = Buffer.from(firma(leadId, azione, scadenza, segreto), 'hex');
  if (!timingSafeEqual(atteso, Buffer.from(sig, 'hex')))
    return { ok: false, motivo: 'invalido' };
  if (ora > scadenza) return { ok: false, motivo: 'scaduto' };
  return { ok: true, leadId, azione };
}

/** Stati di partenza ammessi e stato di arrivo. APPROVATO/SCARTATO sono finali: il link non e' riusabile. */
export const TRANSIZIONI: Record<Azione, { da: string[]; a: string }> = {
  verifica: { da: ['NUOVO'], a: 'IN_VALUTAZIONE' },
  approva: { da: ['NUOVO', 'IN_VALUTAZIONE'], a: 'APPROVATO' },
  scarta: { da: ['NUOVO', 'IN_VALUTAZIONE'], a: 'SCARTATO' },
};
