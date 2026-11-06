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

/** Colonne ordinabili della tabella → campo DB (whitelist). "attesa" = data di ricezione invertita. */
export const ORDINAMENTI: Record<string, { campo: string; inverti?: boolean }> =
  {
    id: { campo: 'id' },
    richiedente: { campo: 'ragioneSociale' },
    piva: { campo: 'partitaIva' },
    ricevuta: { campo: 'createdAt' },
    verdetto: { campo: 'verdetto' },
    stato: { campo: 'stato' },
    attesa: { campo: 'createdAt', inverti: true },
  };

export const VERDETTI = ['BUONO', 'VERIFICARE', 'SCARTARE'];

/** Eventi errore → evento di successo che li chiude: un errore è attivo finché il successo
 * corrispondente non arriva DOPO. Usato sia per la lista (avviso riga) che per il dettaglio (banner). */
export const COPPIE_ERRORE: Record<string, string> = {
  conferma_errore: 'conferma_inviata',
  indagine_errore: 'indagine',
  mail_errore: 'mail_inviata',
  promemoria_errore: 'promemoria_inviato',
  invito_errore: 'invito_inviato',
  export_errore: 'export_integra',
  aggancio_errore: 'cliente_collegato',
  aggancio_conflitto: 'cliente_collegato',
  aggancio_senza_email: 'invito_inviato',
  // Non è un guasto: resta segnalata finché non si sceglie quale email usare per l'accesso.
  email_diversa: 'email_scelta',
};

export function erroriAttivi(
  leadId: number,
  eventi: { leadId: number; tipo: string; createdAt: Date }[],
): string[] {
  const miei = eventi.filter((e) => e.leadId === leadId);
  return Object.keys(COPPIE_ERRORE).filter((errore) => {
    const ok = COPPIE_ERRORE[errore];
    return miei.some(
      (e) =>
        e.tipo === errore &&
        !miei.some((s) => s.tipo === ok && s.createdAt > e.createdAt),
    );
  });
}

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
