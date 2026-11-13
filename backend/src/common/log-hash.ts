import { createHmac } from 'crypto';

/**
 * Identificativo opaco per i log: permette di ritrovare le righe di una persona partendo
 * dalla sua email (ticket di supporto) senza conservarla in chiaro.
 * HMAC con segreto: senza il segreto non si inverte a partire da un elenco di indirizzi.
 */
export function hashLogIdentifier(value: string): string {
  const secret =
    process.env.LOG_HASH_SECRET || process.env.SESSION_SECRET || 'solo-sviluppo';
  return createHmac('sha256', secret)
    .update(value.trim().toLowerCase())
    .digest('hex')
    .slice(0, 32);
}
