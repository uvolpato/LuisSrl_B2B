-- Ordine di visualizzazione delle varianti all'interno di un articolo
-- (griglia d'ordine e tab Varianti ordinabili dall'admin via drag&drop).
ALTER TABLE "varianti" ADD COLUMN IF NOT EXISTS "ordinamento" INTEGER NOT NULL DEFAULT 0;

-- Ordine iniziale: alfabetico per codice (poi l'admin lo aggiusta via drag&drop).
UPDATE "varianti" v
SET "ordinamento" = s.rn
FROM (
  SELECT "codice", (row_number() OVER (ORDER BY "codice" ASC))::int AS rn
  FROM "varianti"
) s
WHERE v."codice" = s."codice";
