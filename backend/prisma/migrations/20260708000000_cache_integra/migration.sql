-- Abilita pg_trgm per ricerca ILIKE veloce
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Sync log: traccia ogni sincronizzazione
CREATE TABLE IF NOT EXISTS sync_log (
  id            SERIAL PRIMARY KEY,
  entity        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'running',
  rows_total    INT,
  rows_ok       INT,
  rows_error    INT,
  error_text    TEXT,
  source_view   TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

-- Cache famiglie Integra
CREATE TABLE IF NOT EXISTS integra_famiglie (
  codice    TEXT PRIMARY KEY,
  nome      TEXT NOT NULL,
  sync_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cache linee Integra
CREATE TABLE IF NOT EXISTS integra_linee (
  codice            TEXT PRIMARY KEY,
  nome              TEXT NOT NULL,
  famiglia_codice   TEXT REFERENCES integra_famiglie(codice),
  sync_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cache articoli Integra (varianti)
CREATE TABLE IF NOT EXISTS integra_articoli (
  pro_cod               TEXT PRIMARY KEY,
  pro_descr             TEXT,
  famiglia_codice       TEXT REFERENCES integra_famiglie(codice),
  linea_codice          TEXT REFERENCES integra_linee(codice),
  codice_alternativo    TEXT,
  codice_esterno        TEXT,
  incluso_b2b           BOOLEAN NOT NULL DEFAULT false,
  prodotto_obsoleto     BOOLEAN NOT NULL DEFAULT false,
  dimensione_json       JSONB,
  dimensione_testo      TEXT,
  multiplo_qta          INTEGER,
  unita_misura          TEXT,
  data_ultmod           TIMESTAMPTZ,
  extra                 JSONB DEFAULT '{}'::jsonb,
  sync_status           TEXT NOT NULL DEFAULT 'ok',
  sync_error            TEXT,
  sync_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indici per ricerca full-text
CREATE INDEX IF NOT EXISTS idx_articoli_descr  ON integra_articoli USING gin (pro_descr gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_articoli_cod    ON integra_articoli USING gin (pro_cod gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_articoli_famiglia ON integra_articoli(famiglia_codice);
CREATE INDEX IF NOT EXISTS idx_articoli_linea    ON integra_articoli(linea_codice);
CREATE INDEX IF NOT EXISTS idx_articoli_extra    ON integra_articoli USING gin (extra);

-- Indice filtrato: cerca errori velocemente
CREATE INDEX IF NOT EXISTS idx_articoli_errors   ON integra_articoli(sync_status) WHERE sync_status != 'ok';

-- Indici per sync_log (pulizia e monitoraggio)
CREATE INDEX IF NOT EXISTS idx_sync_log_entity   ON sync_log(entity, started_at DESC);
