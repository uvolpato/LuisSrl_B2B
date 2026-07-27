-- Ricerca semantica articoli — storage embedding SENZA estensioni.
-- Additivo e idempotente (regola DB del progetto): nessun DROP, rilanciabile.
-- Uso:  npx prisma db execute --file prisma/embedding-setup.sql   (o psql -f ...)
--
-- Scelta: colonna array standard (double precision[]) invece di pgvector, perche'
-- pgvector non e' installabile su PostgreSQL 12 Windows senza compilazione.
-- La similarita' coseno e' calcolata in Node su un catalogo di poche migliaia di
-- articoli (millisecondi). Ceiling: se il catalogo cresce di ordini di grandezza,
-- migrare a pgvector (colonna vector + indice HNSW) e cambiare searchSemantica.

CREATE TABLE IF NOT EXISTS articolo_embedding (
  articolo_id  INTEGER PRIMARY KEY REFERENCES articoli(id) ON DELETE CASCADE,
  text_vec     double precision[],   -- embedding testuale (dim dal modello attivo, es. 768)
  fonte_hash   TEXT,                 -- sha256 del blob testo: salta il re-embed se invariato
  updated_at   TIMESTAMPTZ DEFAULT now()
);
