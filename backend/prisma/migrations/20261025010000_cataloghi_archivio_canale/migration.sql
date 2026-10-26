-- Archivio cataloghi (Archivia/Ripristina) e canale della campagna (email | link). Additiva.
ALTER TABLE "cataloghi" ADD COLUMN IF NOT EXISTS "archiviato" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "mailing" ADD COLUMN IF NOT EXISTS "canale" TEXT NOT NULL DEFAULT 'email';
