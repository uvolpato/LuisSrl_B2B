-- Campo css per il posizionamento/ritaglio per-immagine (feature EditImageModal).
-- Era stato aggiunto solo via `prisma db push` (mancava dai file migration):
-- su DB nuovo va creato, su DB live esiste gia' (nullable) -> normalizziamo.
ALTER TABLE "immagini" ADD COLUMN IF NOT EXISTS "css" TEXT NOT NULL DEFAULT '';
UPDATE "immagini" SET "css" = '' WHERE "css" IS NULL;
ALTER TABLE "immagini" ALTER COLUMN "css" SET DEFAULT '';
ALTER TABLE "immagini" ALTER COLUMN "css" SET NOT NULL;
