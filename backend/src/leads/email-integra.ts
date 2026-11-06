/**
 * Email di accesso del cliente che arriva da un lead: quella di Integra se c'e', altrimenti quella
 * approvata nella richiesta. Se le due differiscono va segnalato nell'approvazione.
 */
/** Email effettiva per l'accesso: scelta a mano, poi Integra, poi quella della richiesta. */
export function emailEffettiva(
  scelta: string | null | undefined,
  emailIntegra: string | null | undefined,
  emailRichiesta: string,
): string {
  return (
    (scelta ?? '').trim().toLowerCase() ||
    emailAccesso(emailIntegra, emailRichiesta).email
  );
}

export function emailAccesso(
  emailIntegra: string | null | undefined,
  emailRichiesta: string,
): { email: string; diversa: boolean; daRichiesta: boolean } {
  const integra = (emailIntegra ?? '').trim().toLowerCase();
  const richiesta = emailRichiesta.trim().toLowerCase();
  return {
    email: integra || richiesta,
    diversa: !!integra && integra !== richiesta,
    daRichiesta: !integra,
  };
}
