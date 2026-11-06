-- Ricerca cliente per P.IVA (approvazione richieste / aggancio lead) su integra_clienti. Additiva.
-- Indice su espressione: le query confrontano la P.IVA normalizzata a sole cifre.
-- integra_clienti viene ricreata da syncClienti(): l'indice va ricreato anche lì (sync.service.ts).
CREATE INDEX IF NOT EXISTS integra_clienti_piva_digits_idx
  ON integra_clienti ((regexp_replace(coalesce(partita_iva, ''), '[^0-9]', '', 'g')));
