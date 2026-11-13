/**
 * Pulizia degli URL destinati ai log: via la querystring (può contenere ricerche e firme)
 * e i token che viaggiano nel path (sono credenziali).
 */
export function urlSenzaSegreti(url: string): string {
  return url
    .split('?')[0]
    .replace(/^(\/api\/cataloghi\/webhook)\/[^/]+/, '$1/[secret]')
    // Il lookahead evita di rimascherare "webhook" come se fosse un token.
    .replace(/^(\/api\/cataloghi)\/(?!webhook(?:\/|$))[^/]+/, '$1/[token]')
    .replace(/^(\/api\/progetti\/pubblico)\/[^/]+/, '$1/[token]');
}
