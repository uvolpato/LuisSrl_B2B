-- Aggiunge colonna codice_numerico a integra_famiglie e integra_linee
-- per mappare codici Integra numerici → codici FAM_*/LIN_* del portale.
ALTER TABLE integra_famiglie ADD COLUMN IF NOT EXISTS codice_numerico TEXT;
ALTER TABLE integra_linee   ADD COLUMN IF NOT EXISTS codice_numerico TEXT;

-- Popola con i valori esistenti (le tabelle attuali hanno codice = numerico)
UPDATE integra_famiglie SET codice_numerico = codice WHERE codice_numerico IS NULL;
UPDATE integra_linee   SET codice_numerico = codice WHERE codice_numerico IS NULL;
