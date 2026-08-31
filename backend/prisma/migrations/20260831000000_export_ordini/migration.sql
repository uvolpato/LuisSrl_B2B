-- Export ordini B2B -> Integra (file .xlsx sul tracciato di import).
-- Additivo e idempotente: nessun DROP, rilanciabile. Vedi prisma/ordini-fdw-spec.md §7.

-- Chiave di idempotenza: valorizzata => l'ordine non viene mai riesportato.
ALTER TABLE ordini_clienti ADD COLUMN IF NOT EXISTS esportato_il   TIMESTAMPTZ;
-- Nome del file prodotto (audit e riconciliazione manuale).
ALTER TABLE ordini_clienti ADD COLUMN IF NOT EXISTS esportato_file TEXT;
-- Numero documento assegnato da Integra, valorizzato al ritorno via mvt_vsrif (§4.1).
ALTER TABLE ordini_clienti ADD COLUMN IF NOT EXISTS numero_integra TEXT;

-- La coda di export e' "BOZZA e mai esportato": indice parziale, resta piccolo.
CREATE INDEX IF NOT EXISTS ordini_clienti_da_esportare_idx
  ON ordini_clienti (id) WHERE esportato_il IS NULL;
