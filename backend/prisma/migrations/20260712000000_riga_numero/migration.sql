-- Numero di riga ordine (da integra_righe_ordini.id_riga)
ALTER TABLE righe_ordini ADD COLUMN IF NOT EXISTS numero_riga INTEGER;
