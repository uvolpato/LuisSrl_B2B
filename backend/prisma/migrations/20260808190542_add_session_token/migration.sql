-- Session token per prevenire accessi simultanei
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_token TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS session_token TEXT;

-- Colonne mancanti su customers (aggiunte via db push, mai migrate)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS telefono_fisso TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sito_web TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS codice_porto TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS codice_spedizione TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS codice_vettore TEXT;
