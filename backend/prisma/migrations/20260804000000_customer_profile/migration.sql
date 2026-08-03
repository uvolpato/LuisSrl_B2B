CREATE TABLE IF NOT EXISTS customer_profiles (
  id               SERIAL PRIMARY KEY,
  customer_id      INT NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  settore          TEXT,
  fatturato_stimato DECIMAL,
  composizione     TEXT,
  sedi             TEXT,
  contatti         JSONB,
  segmento         TEXT,
  sintesi          TEXT,
  fonti            JSONB,
  generato_il      TIMESTAMPTZ NOT NULL DEFAULT now(),
  aggiornato_il    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_customer_id ON customer_profiles(customer_id);