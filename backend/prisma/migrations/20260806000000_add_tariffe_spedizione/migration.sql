CREATE TABLE IF NOT EXISTS "tariffe_spedizione" (
    "id" SERIAL PRIMARY KEY,
    "nazione" TEXT NOT NULL,
    "regione" TEXT,
    "base_percent" DECIMAL(5, 2) NOT NULL,
    "stato" TEXT NOT NULL DEFAULT 'configura',
    "soglia_importo" DECIMAL(12, 2),
    "ranges" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "tariffe_spedizione_nazione_regione_key"
  ON "tariffe_spedizione" ("nazione", "regione");
