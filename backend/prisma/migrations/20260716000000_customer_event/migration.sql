-- Eventi comportamentali clienti (tracking).
CREATE TABLE IF NOT EXISTS "customer_event" (
  "id"          SERIAL PRIMARY KEY,
  "customer_id" INTEGER NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "session_id"  TEXT,
  "tipo"        TEXT NOT NULL,
  "entita"      TEXT,
  "entita_id"   TEXT,
  "dettagli"    JSONB,
  "ip"          TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "customer_event_customer_created_idx" ON "customer_event"("customer_id", "created_at");
CREATE INDEX IF NOT EXISTS "customer_event_tipo_created_idx" ON "customer_event"("tipo", "created_at");
