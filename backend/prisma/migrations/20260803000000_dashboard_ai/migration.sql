-- Dashboard AI: promozioni, box di suggerimento configurabili e cache per-cliente.
CREATE TABLE IF NOT EXISTS "promozioni" (
  "id"          SERIAL PRIMARY KEY,
  "titolo"      TEXT NOT NULL,
  "tipo"        TEXT NOT NULL,
  "valore"      DECIMAL(65,30),
  "data_inizio" TIMESTAMP(3) NOT NULL,
  "data_fine"   TIMESTAMP(3) NOT NULL,
  "famiglie"    TEXT[] NOT NULL,
  "articoli"    TEXT[] NOT NULL,
  "priorita"    INTEGER NOT NULL DEFAULT 0,
  "attiva"      BOOLEAN NOT NULL DEFAULT true,
  "creato_il"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "aggiornato_il" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "promozioni_attiva_data_fine_idx" ON "promozioni"("attiva", "data_fine");

CREATE TABLE IF NOT EXISTS "suggestion_boxes" (
  "id"                SERIAL PRIMARY KEY,
  "titolo"            TEXT NOT NULL,
  "prompt"            TEXT NOT NULL,
  "n_articoli"        INTEGER NOT NULL DEFAULT 10,
  "pesi"              JSONB NOT NULL DEFAULT '{"acquisti":0.40,"tracking":0.25,"progetti":0.20,"affinita":0.15}',
  "solo_in_offerta"   BOOLEAN NOT NULL DEFAULT false,
  "escludi_acquistati" BOOLEAN NOT NULL DEFAULT true,
  "scope_famiglia"    TEXT NOT NULL DEFAULT '',
  "scope_raccolta"    TEXT NOT NULL DEFAULT '',
  "attiva"            BOOLEAN NOT NULL DEFAULT true,
  "ordinamento"       INTEGER NOT NULL DEFAULT 0,
  "creato_il"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "aggiornato_il"     TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "dashboard_boxes" (
  "id"          SERIAL PRIMARY KEY,
  "customer_id" INTEGER NOT NULL,
  "box_id"      INTEGER NOT NULL,
  "titolo"      TEXT NOT NULL,
  "rationale"   TEXT,
  "prodotti"    JSONB NOT NULL,
  "generato_il" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "dashboard_boxes_customer_box_key" ON "dashboard_boxes"("customer_id", "box_id");
CREATE INDEX IF NOT EXISTS "dashboard_boxes_customer_idx" ON "dashboard_boxes"("customer_id");
