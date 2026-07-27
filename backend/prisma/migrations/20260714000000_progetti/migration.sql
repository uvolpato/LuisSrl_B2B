-- Progetti: liste di lavoro del cliente (selezioni componibili nel tempo).
CREATE TABLE IF NOT EXISTS "progetti" (
  "id"          SERIAL PRIMARY KEY,
  "cliente_id"  INTEGER NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "nome"        TEXT NOT NULL,
  "note"        TEXT,
  "share_token" TEXT NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "progetti_share_token_key" ON "progetti"("share_token");
CREATE INDEX IF NOT EXISTS "progetti_cliente_id_idx" ON "progetti"("cliente_id");

CREATE TABLE IF NOT EXISTS "progetto_items" (
  "id"              SERIAL PRIMARY KEY,
  "progetto_id"     INTEGER NOT NULL REFERENCES "progetti"("id") ON DELETE CASCADE,
  "variante_codice" TEXT NOT NULL,
  "quantita"        INTEGER NOT NULL DEFAULT 1,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "progetto_items_progetto_id_variante_codice_key" ON "progetto_items"("progetto_id", "variante_codice");
