import { createHash, randomBytes } from 'crypto';

/**
 * Il sessionToken viaggia solo nel cookie: in DB si conserva l'hash.
 * Token ad alta entropia (UUID): SHA-256 basta, non serve un hash lento.
 */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Token per link monouso (invito): casuale, mai salvato in chiaro. */
export function generaTokenInvito(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
