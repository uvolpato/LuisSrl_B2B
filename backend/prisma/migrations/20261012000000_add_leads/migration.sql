-- Lead dal sito vetrina (Fase 1 qualifica lead): additiva, idempotente.
CREATE TABLE IF NOT EXISTS "leads" (
  "id" SERIAL PRIMARY KEY,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ragione_sociale" TEXT NOT NULL,
  "partita_iva" TEXT NOT NULL,
  "codice_fiscale" TEXT,
  "referente" TEXT NOT NULL,
  "tipo_attivita" TEXT,
  "email" TEXT NOT NULL,
  "telefono" TEXT,
  "citta" TEXT,
  "messaggio" TEXT,
  "lingua" TEXT NOT NULL DEFAULT 'it',
  "privacy_accettata_il" TIMESTAMP(3) NOT NULL,
  "privacy_versione" TEXT NOT NULL,
  "ip" TEXT,
  "user_agent" TEXT,
  "stato" TEXT NOT NULL DEFAULT 'NUOVO'
);
CREATE INDEX IF NOT EXISTS "leads_created_at_idx" ON "leads"("created_at");
CREATE INDEX IF NOT EXISTS "leads_stato_created_at_idx" ON "leads"("stato", "created_at");

CREATE TABLE IF NOT EXISTS "lead_events" (
  "id" SERIAL PRIMARY KEY,
  "lead_id" INTEGER NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "tipo" TEXT NOT NULL,
  "dettagli" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "lead_events_lead_id_created_at_idx" ON "lead_events"("lead_id", "created_at");
