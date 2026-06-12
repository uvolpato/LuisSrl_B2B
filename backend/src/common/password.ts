import * as argon2 from 'argon2';
import { randomInt } from 'crypto';

/**
 * Hash di confronto usato quando l'utente non esiste: equalizza i tempi di
 * risposta del login per non rivelare quali email sono registrate.
 */
export const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export function verifyPassword(
  hash: string,
  plain: string,
): Promise<boolean> {
  return argon2.verify(hash, plain).catch(() => false);
}

/** Password provvisoria leggibile: niente caratteri ambigui (0/O, 1/l/I). */
export function generateProvisionalPassword(length = 12): string {
  const charset = 'abcdefghjkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += charset[randomInt(charset.length)];
  }
  return out;
}
