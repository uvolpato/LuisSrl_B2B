-- Carrello cliente (1:1 con customers)
CREATE TABLE IF NOT EXISTS carrelli (
  id          SERIAL PRIMARY KEY,
  cliente_id  INTEGER NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  creato_il   TIMESTAMP NOT NULL DEFAULT NOW(),
  aggiornato_il TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Item nel carrello
CREATE TABLE IF NOT EXISTS carrello_items (
  id               SERIAL PRIMARY KEY,
  carrello_id      INTEGER NOT NULL REFERENCES carrelli(id) ON DELETE CASCADE,
  variante_codice  TEXT NOT NULL,
  quantita         INTEGER NOT NULL DEFAULT 1,
  salvato          BOOLEAN NOT NULL DEFAULT FALSE,
  creato_il        TIMESTAMP NOT NULL DEFAULT NOW(),
  aggiornato_il    TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(carrello_id, variante_codice)
);

CREATE INDEX IF NOT EXISTS idx_carrello_items_carrello_id ON carrello_items(carrello_id);
CREATE INDEX IF NOT EXISTS idx_carrello_items_salvato ON carrello_items(carrello_id, salvato);
