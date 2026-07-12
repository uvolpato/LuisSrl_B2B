-- Nuovi campi Customer
ALTER TABLE customers ADD COLUMN IF NOT EXISTS codice_cliente TEXT UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS codice_listino TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS indirizzo TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cap TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS citta TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS provincia TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS codice_pagamento TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS fido DECIMAL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS descrizione TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS descrizione_dettagliata TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS prompt_ai TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS wizard_step_testi JSONB;

-- Indirizzi cliente (spedizione/fatturazione)
CREATE TABLE IF NOT EXISTS indirizzi_clienti (
  id               SERIAL PRIMARY KEY,
  customer_id      INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  ragione_sociale  TEXT,
  indirizzo        TEXT,
  cap              TEXT,
  citta            TEXT,
  provincia        TEXT,
  flag_spedizione  BOOLEAN NOT NULL DEFAULT false
);

-- Contatti cliente (email/telefono/note per profilo AI)
CREATE TABLE IF NOT EXISTS contatti_clienti (
  id          SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,
  data        TIMESTAMPTZ NOT NULL DEFAULT now(),
  contenuto   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ordini cliente (storico)
CREATE TABLE IF NOT EXISTS ordini_clienti (
  id             SERIAL PRIMARY KEY,
  numero_ordine  TEXT NOT NULL,
  data_ordine    DATE,
  customer_id    INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  importo_totale DECIMAL,
  stato          TEXT
);

-- Righe ordini
CREATE TABLE IF NOT EXISTS righe_ordini (
  id              SERIAL PRIMARY KEY,
  ordine_id       INTEGER NOT NULL REFERENCES ordini_clienti(id) ON DELETE CASCADE,
  codice_prodotto TEXT,
  descrizione     TEXT,
  quantita        DECIMAL,
  prezzo          DECIMAL
);
