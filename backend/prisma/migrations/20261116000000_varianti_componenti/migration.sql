-- Varianti "kit": il padre è l'unico codice ordinabile (prezzo e giacenza suoi),
-- i figli (`padre-00001`, ...) finiscono qui e si mostrano come tabella nella
-- descrizione. Additivo: nessuna tabella esistente viene toccata.

CREATE TABLE IF NOT EXISTS varianti_componenti (
  id           SERIAL PRIMARY KEY,
  padre_codice TEXT NOT NULL REFERENCES varianti (codice) ON DELETE CASCADE,
  codice       TEXT NOT NULL,
  descrizione  TEXT NOT NULL,
  dimensioni   TEXT,
  quantita     INTEGER NOT NULL DEFAULT 1,
  ordinamento  INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT varianti_componenti_padre_codice_codice_key UNIQUE (padre_codice, codice)
);

CREATE INDEX IF NOT EXISTS varianti_componenti_padre_codice_ordinamento_idx
  ON varianti_componenti (padre_codice, ordinamento);
