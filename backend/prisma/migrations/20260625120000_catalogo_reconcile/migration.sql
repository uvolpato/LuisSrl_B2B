-- Allinea le migration allo schema: due colonne erano state aggiunte solo via
-- `prisma db push` e mancavano dai file migration (un deploy pulito creava un DB
-- senza di esse). IF NOT EXISTS: no-op sul DB live (che le ha gia'), crea su DB nuovo.
ALTER TABLE "articoli" ADD COLUMN IF NOT EXISTS "colore_rgb" TEXT DEFAULT '';
ALTER TABLE "immagini" ADD COLUMN IF NOT EXISTS "in_galleria" BOOLEAN NOT NULL DEFAULT true;
