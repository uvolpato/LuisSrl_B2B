-- Parametri di generazione AI e riferimento all'immagine sorgente.
ALTER TABLE "immagini" ADD COLUMN IF NOT EXISTS "ai_model" TEXT;
ALTER TABLE "immagini" ADD COLUMN IF NOT EXISTS "ai_aspect" TEXT;
ALTER TABLE "immagini" ADD COLUMN IF NOT EXISTS "ai_temperature" DOUBLE PRECISION;
ALTER TABLE "immagini" ADD COLUMN IF NOT EXISTS "ai_seed" INTEGER;
ALTER TABLE "immagini" ADD COLUMN IF NOT EXISTS "immagine_padre_id" INTEGER;

-- self-relation: padre eliminato -> figli con riferimento a NULL
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'immagini_immagine_padre_id_fkey') THEN
    ALTER TABLE "immagini" ADD CONSTRAINT "immagini_immagine_padre_id_fkey"
      FOREIGN KEY ("immagine_padre_id") REFERENCES "immagini"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
