-- Ricerca semantica articoli — infrastruttura pgvector.
-- Additivo e idempotente (regola DB del progetto): nessun DROP, rilanciabile.
-- Uso:  psql "<DATABASE_URL>" -f backend/prisma/embedding-setup.sql
--
-- Nota indice ANN: a basso volume (poche migliaia di articoli) lo scan coseno
-- esatto e' gia' in millisecondi, quindi NON creiamo indice HNSW/ivfflat ora.
-- Quando il catalogo cresce, aggiungere:
--   CREATE INDEX IF NOT EXISTS idx_artemb_text
--     ON articolo_embedding USING hnsw (text_vec vector_cosine_ops);   -- pgvector >= 0.5
-- (verificare prima: SELECT extversion FROM pg_extension WHERE extname='vector';)

CREATE EXTENSION IF NOT EXISTS vector;

-- Dimensione allineata al modello di embedding attivo (Gemini gemini-embedding-001 @ 768).
-- Se in futuro si passa a un modello con dim diversa (es. Mini PC / bge-m3 @ 1024),
-- va rigenerata la colonna e rilanciato il backfill:
--   ALTER TABLE articolo_embedding DROP COLUMN text_vec, ADD COLUMN text_vec vector(<nuova_dim>);
CREATE TABLE IF NOT EXISTS articolo_embedding (
  articolo_id  INTEGER PRIMARY KEY REFERENCES articoli(id) ON DELETE CASCADE,
  text_vec     vector(768),
  fonte_hash   TEXT,          -- sha256 del blob testo: salta il re-embed se invariato
  updated_at   TIMESTAMPTZ DEFAULT now()
);
