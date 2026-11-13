/**
 * Referenti pubblici proposti dalla ricerca web.
 * Regola GDPR: senza URL della fonte il nome non entra nel DB (evita nomi inventati
 * dal modello e rende il dato verificabile e opponibile).
 */
export interface ReferentePubblico {
  nome: string;
  ruolo: string;
  /** URL http(s) della pagina pubblica che nomina la persona. */
  fonte: string;
  stato: 'da-verificare';
}

const MAX_NOME = 80;
const MAX_RUOLO = 80;
const MAX_FONTE = 300;
const URL_PUBBLICO = /^https:\/\/[^\s<>"']+$/i;

/** Tiene solo nome + ruolo + fonte valida. Scarta tutto il resto. */
export function filtraReferentiPubblici(raw: unknown): ReferentePubblico[] {
  if (!Array.isArray(raw)) return [];
  const out: ReferentePubblico[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const x = r as Record<string, unknown>;
    const nome =
      typeof x.nome === 'string' ? x.nome.trim().slice(0, MAX_NOME) : '';
    const ruolo =
      typeof x.ruolo === 'string' ? x.ruolo.trim().slice(0, MAX_RUOLO) : '';
    const fonte =
      typeof x.fonte === 'string' ? x.fonte.trim().slice(0, MAX_FONTE) : '';
    if (!nome || !ruolo || !URL_PUBBLICO.test(fonte)) continue;
    // Nome e ruolo sono testo: un recapito qui è un errore del modello, non un dato voluto.
    if (/@/.test(nome) || /\d{6,}/.test(nome)) continue;
    if (out.some((o) => o.nome.toLowerCase() === nome.toLowerCase())) continue;
    out.push({ nome, ruolo, fonte, stato: 'da-verificare' });
  }
  return out;
}
