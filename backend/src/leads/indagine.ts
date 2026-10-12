/** Logica pura della qualifica lead (testabile senza rete): P.IVA, segnali, verdetto. */

export type StatoSegnale =
  | 'CONFERMATO'
  | 'NEUTRO'
  | 'NON_VERIFICATO'
  | 'NEGATIVO';
export type Verdetto = 'BUONO' | 'VERIFICARE' | 'SCARTARE';

export interface Segnale {
  chiave: 'partitaIva' | 'sitoWeb' | 'email' | 'presenzaWeb' | 'coerenza';
  etichetta: string;
  stato: StatoSegnale;
  nota: string;
  fonti: string[];
}

export interface ReportIndagine {
  segnali: Segnale[];
  verdetto: Verdetto;
  motivazione: string;
  checklist: string[];
  sintesi: string | null;
  durataMs: number;
  errore?: string;
}

/** Checksum ufficiale P.IVA italiana (11 cifre, algoritmo di Luhn modificato). */
export function pivaItalianaValida(piva: string): boolean {
  if (!/^\d{11}$/.test(piva) || /^0{11}$/.test(piva)) return false;
  let somma = 0;
  for (let i = 0; i < 10; i++) {
    let c = Number(piva[i]);
    if (i % 2 === 1) {
      c *= 2;
      if (c > 9) c -= 9;
    }
    somma += c;
  }
  return (10 - (somma % 10)) % 10 === Number(piva[10]);
}

/** "01234567890" → IT + numero; "DE123456789" → DE + numero. null se formato non gestito. */
export function scomponiPiva(
  piva: string,
): { paese: string; numero: string } | null {
  const p = piva.replace(/\s/g, '').toUpperCase();
  if (/^\d{11}$/.test(p)) return { paese: 'IT', numero: p };
  const m = /^([A-Z]{2})([0-9A-Z]{2,13})$/.exec(p);
  return m ? { paese: m[1], numero: m[2] } : null;
}

/**
 * Verdetto a tre voci da segnali (specifica §4). Fail closed: senza conferme forti
 * non e' mai BUONO; SCARTARE solo su prove nette (P.IVA invalida o nessuna traccia + email usa-e-getta).
 */
export function calcolaVerdetto(segnali: Segnale[]): {
  verdetto: Verdetto;
  motivazione: string;
} {
  const s = (k: Segnale['chiave']) =>
    segnali.find((x) => x.chiave === k)?.stato ?? 'NON_VERIFICATO';
  const piva = s('partitaIva');
  const email = s('email');
  const web = [s('sitoWeb'), s('presenzaWeb')];

  if (piva === 'NEGATIVO')
    return {
      verdetto: 'SCARTARE',
      motivazione: 'Partita IVA non valida o inesistente',
    };
  if (email === 'NEGATIVO' && !web.includes('CONFERMATO'))
    return {
      verdetto: 'SCARTARE',
      motivazione: "Email usa-e-getta e nessuna presenza web dell'azienda",
    };
  if (
    piva === 'CONFERMATO' &&
    web.includes('CONFERMATO') &&
    email !== 'NEGATIVO' &&
    s('coerenza') !== 'NEGATIVO'
  )
    return {
      verdetto: 'BUONO',
      motivazione:
        'Dati essenziali confermati: P.IVA valida e presenza web coerente',
    };
  return {
    verdetto: 'VERIFICARE',
    motivazione: 'Dati parziali o non confermati: serve un contatto diretto',
  };
}

/** Punti da verificare a mano (verdetto VERIFICARE): un punto per ogni segnale non confermato. */
export function checklistVerifica(
  segnali: Segnale[],
  contatti: { email: string; telefono: string | null },
): string[] {
  const punti = segnali
    .filter((x) => x.stato === 'NON_VERIFICATO' || x.stato === 'NEGATIVO')
    .map((x) => `${x.etichetta}: ${x.nota}`);
  const canali = [
    contatti.telefono && `telefono ${contatti.telefono}`,
    `email ${contatti.email}`,
  ].filter(Boolean);
  return punti.length
    ? [...punti, `Canali di contatto: ${canali.join(' · ')}`]
    : [];
}
