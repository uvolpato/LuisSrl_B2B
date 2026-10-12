/** Conservazione lead (GDPR, limitazione della conservazione): logica pura, testabile. */

/** Stati la cui richiesta non e' diventata cliente: dopo N mesi i dati personali vanno azzerati. */
export const STATI_DA_ANONIMIZZARE = ['SCARTATO', 'NUOVO', 'IN_VALUTAZIONE'];

export const MESI_DEFAULT = 12;

export function mesiConservazione(): number {
  const n = Number(process.env.LEAD_RETENTION_MESI);
  return Number.isInteger(n) && n > 0 ? n : MESI_DEFAULT;
}

/** Data limite: richieste piu' vecchie di N mesi (dall'ultima decisione o dalla creazione). */
export function limite(mesi: number, ora = new Date()): Date {
  const d = new Date(ora);
  d.setMonth(d.getMonth() - mesi);
  return d;
}

/**
 * Campi personali azzerati. Restano i dati aziendali (ragione sociale, P.IVA, sede, verdetto, date):
 * non sono dati personali e servono a statistiche e a riconoscere una P.IVA gia' scartata.
 * Il report perde la checklist (contiene email e telefono del referente).
 */
export function datiAnonimi(report: unknown) {
  const r =
    report && typeof report === 'object'
      ? { ...(report as Record<string, unknown>) }
      : null;
  if (r) delete r.checklist;
  return {
    referente: 'anonimizzato',
    email: 'anonimizzato',
    telefono: null,
    messaggio: null,
    ip: null,
    userAgent: null,
    report: r,
  };
}
