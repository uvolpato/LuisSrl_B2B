/** Regole incrociate sui dati di fatturazione elettronica (logica pura, testabile). */

/** Serve almeno un canale: SDI valido (non 0000000) oppure PEC. Con SDI 0000000 la PEC e' obbligatoria. */
export function erroreCanaleSdi(
  sdi?: string | null,
  pec?: string | null,
): string | null {
  const s = (sdi ?? '').trim().toUpperCase();
  const p = (pec ?? '').trim();
  if (!s && !p) return 'fatturazione.sdi_o_pec';
  if (s === '0000000' && !p) return 'fatturazione.pec_obbligatoria';
  return null;
}

/** La conferma e' richiesta solo ai clienti nati da una richiesta vetrina, una volta. */
export function confermaRichiesta(c: {
  leadId: number | null;
  datiFatturazioneConfermatiIl: Date | null;
}): boolean {
  return c.leadId != null && c.datiFatturazioneConfermatiIl == null;
}
