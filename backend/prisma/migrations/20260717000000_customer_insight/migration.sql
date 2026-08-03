-- Sintesi AI del comportamento cliente (tracking Fase 3).
CREATE TABLE IF NOT EXISTS "customer_insight" (
  "id"          SERIAL PRIMARY KEY,
  "customer_id" INTEGER NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "periodo"     TEXT NOT NULL,
  "testo"       TEXT NOT NULL,
  "metriche"    JSONB,
  "embedding"   JSONB,
  "generato_il" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "customer_insight_customer_periodo_key" ON "customer_insight"("customer_id", "periodo");
CREATE INDEX IF NOT EXISTS "customer_insight_customer_idx" ON "customer_insight"("customer_id");
