-- Sync state: tiene il cursore incrementale per ogni entita
CREATE TABLE IF NOT EXISTS sync_state (
  entity        TEXT PRIMARY KEY,
  last_cursor   TIMESTAMPTZ,
  last_run_at   TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'ok'
);

-- Cache listini (testata)
CREATE TABLE IF NOT EXISTS integra_listini (
  codice_listino        TEXT PRIMARY KEY,
  descrizione_listino   TEXT,
  listino_obsoleto      INT NOT NULL DEFAULT 0,
  data_modifica         TIMESTAMPTZ
);

-- Cache listini (righe prezzo)
CREATE TABLE IF NOT EXISTS integra_listini_righe (
  id_riga_listino   INT PRIMARY KEY,
  codice_listino    TEXT NOT NULL REFERENCES integra_listini(codice_listino),
  codice_prodotto   TEXT,
  id_variante       INT,
  prezzo_listino    DECIMAL(12,4),
  sconto_1          DECIMAL(6,3),
  sconto_2          DECIMAL(6,3),
  sconto_3          DECIMAL(6,3),
  sconto_4          DECIMAL(6,3),
  listino_obsoleto  INT NOT NULL DEFAULT 0,
  data_modifica     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_listini_righe_listino ON integra_listini_righe(codice_listino);
CREATE INDEX IF NOT EXISTS idx_listini_righe_prodotto ON integra_listini_righe(codice_prodotto);