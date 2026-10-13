/** Area admin "Richieste accesso": filtri e conteggi (logica pura, testabile). */

export const STATI_IN_ATTESA = ['NUOVO', 'IN_VALUTAZIONE'];

export const FILTRI_STATO: Record<string, string[] | null> = {
  'da-decidere': STATI_IN_ATTESA,
  nuovo: ['NUOVO'],
  'in-verifica': ['IN_VALUTAZIONE'],
  approvato: ['APPROVATO'],
  scartato: ['SCARTATO'],
  tutti: null,
};

export const VERDETTI = ['BUONO', 'VERIFICARE', 'SCARTARE'];

/** Giorni di attesa: solo per le richieste ancora da decidere. */
export function giorniAttesa(
  stato: string,
  createdAt: Date,
  ora = new Date(),
): number | null {
  if (!STATI_IN_ATTESA.includes(stato)) return null;
  return Math.max(
    0,
    Math.floor((ora.getTime() - createdAt.getTime()) / (24 * 3600 * 1000)),
  );
}

export const GIORNI_ALLARME = 6;
