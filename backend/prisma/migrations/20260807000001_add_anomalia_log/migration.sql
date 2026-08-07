CREATE TABLE IF NOT EXISTS anomalia_log (
  id          SERIAL PRIMARY KEY,
  tipo        TEXT NOT NULL,
  gravita     TEXT NOT NULL DEFAULT 'info',
  contesto    TEXT,
  messaggio   TEXT NOT NULL,
  dettaglio   JSONB,
  risolto     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  risolto_il  TIMESTAMPTZ
);
