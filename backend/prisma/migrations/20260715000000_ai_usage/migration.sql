-- Tracciamento uso AI (Gemini) con attribuzione attore e costo stimato.
CREATE TABLE IF NOT EXISTS "ai_usage" (
  "id"            SERIAL PRIMARY KEY,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attore_tipo"   TEXT NOT NULL,
  "attore_id"     INTEGER,
  "tipo"          TEXT NOT NULL,
  "modello"       TEXT NOT NULL,
  "token_in"      INTEGER NOT NULL DEFAULT 0,
  "token_out"     INTEGER NOT NULL DEFAULT 0,
  "immagini"      INTEGER NOT NULL DEFAULT 0,
  "costo_stimato" DOUBLE PRECISION NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "ai_usage_created_at_idx" ON "ai_usage"("created_at");
CREATE INDEX IF NOT EXISTS "ai_usage_attore_idx" ON "ai_usage"("attore_tipo", "attore_id");
