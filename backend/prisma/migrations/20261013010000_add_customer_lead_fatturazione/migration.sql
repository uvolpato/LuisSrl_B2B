-- Fase 5 qualifica lead + dati di fatturazione elettronica. Additiva, idempotente.
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "lead_id" INTEGER;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "codice_fiscale" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "codice_sdi" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "pec" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "dati_fatturazione_confermati_il" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "customers_lead_id_key" ON "customers"("lead_id");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_lead_id_fkey') THEN
    ALTER TABLE "customers" ADD CONSTRAINT "customers_lead_id_fkey"
      FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
