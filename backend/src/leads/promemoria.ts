/** Promemoria a shop@ per richieste ferme: logica pura, testabile. */

const GIORNO_MS = 24 * 3600 * 1000;

export const STATI_IN_ATTESA = ['NUOVO', 'IN_VALUTAZIONE'];

export function giorniPromemoria(): number {
  const n = Number(process.env.LEAD_PROMEMORIA_GIORNI);
  return Number.isInteger(n) && n > 0 ? n : 6;
}

/** Serve un promemoria se dall'ultima mail con i pulsanti sono passati almeno N giorni
 *  (i link durano 7: cosi' shop@ ha sempre pulsanti validi). */
export function servePromemoria(
  ultimoInvio: Date,
  ora: Date,
  giorni: number,
): boolean {
  return ora.getTime() - ultimoInvio.getTime() >= giorni * GIORNO_MS;
}

export function giorniDa(da: Date, ora: Date): number {
  return Math.floor((ora.getTime() - da.getTime()) / GIORNO_MS);
}
