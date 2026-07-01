-- Aggiunge colonne mancanti a raccolte (aggiunte allo schema ma mai migrate)
ALTER TABLE "raccolte" ADD COLUMN IF NOT EXISTS "descrizione" TEXT;
ALTER TABLE "raccolte" ADD COLUMN IF NOT EXISTS "sconto" DOUBLE PRECISION;
