/**
 * UPDATE dei clienti già in portale con i dati di Integra, dopo il rebuild di integra_clienti.
 * Con force=true riscrive anche l'email (comportamento storico). Senza force lascia intatta
 * l'email scelta a mano su una richiesta approvata (leads.email_accesso).
 */
export function sqlAggiornaClienti(force: boolean): string {
  const email = force
    ? `COALESCE(NULLIF(i.email, ''), c.email)`
    : `CASE
         WHEN EXISTS (SELECT 1 FROM leads l WHERE l.id = c.lead_id AND l.email_accesso IS NOT NULL)
           THEN c.email
         ELSE COALESCE(NULLIF(i.email, ''), c.email)
       END`;

  return `
    UPDATE customers c
    SET
      email = ${email},
      nome = COALESCE(NULLIF(i.ragione_sociale, ''), c.nome),
      ragione_sociale = CASE WHEN NULLIF(i.ragione_sociale, '') IS NOT NULL THEN i.ragione_sociale ELSE c.ragione_sociale END,
      partita_iva = COALESCE(NULLIF(i.partita_iva, ''), c.partita_iva),
      telefono = COALESCE(NULLIF(i.telefono, ''), c.telefono),
      sito_web = COALESCE(NULLIF(i.web, ''), c.sito_web),
      indirizzo = COALESCE(NULLIF(i.indirizzo, ''), c.indirizzo),
      cap = COALESCE(NULLIF(i.cap, ''), c.cap),
      citta = COALESCE(NULLIF(i.citta, ''), c.citta),
      provincia = COALESCE(NULLIF(i.provincia, ''), c.provincia),
      codice_listino = COALESCE(NULLIF(NULLIF(i.codice_listino, ''), '--'), c.codice_listino, 'LIS1'),
      codice_pagamento = COALESCE(NULLIF(i.codice_pagamento, ''), c.codice_pagamento),
      fido = COALESCE(i.fido_totale, c.fido),
      updated_at = NOW()
    FROM integra_clienti i
    WHERE i.codice_cliente = c.codice_cliente
      AND c.codice_cliente IS NOT NULL
  `;
}
