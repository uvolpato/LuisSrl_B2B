-- Ordine di visualizzazione delle famiglie (card ordinabili dall'admin).
ALTER TABLE "famiglie" ADD COLUMN IF NOT EXISTS "ordine" INTEGER NOT NULL DEFAULT 0;

-- Ordine iniziale: alfabetico per nome (poi l'admin lo aggiusta via drag&drop).
UPDATE "famiglie" f
SET "ordine" = s.rn
FROM (
  SELECT "codice", (row_number() OVER (ORDER BY "nome" ASC))::int AS rn
  FROM "famiglie"
) s
WHERE f."codice" = s."codice";
