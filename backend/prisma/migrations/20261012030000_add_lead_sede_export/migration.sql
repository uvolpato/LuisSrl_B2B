-- Fase 4 qualifica lead: sede legale (da VIES/web) ed export anagrafica verso Integra. Additiva.
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "sede_indirizzo" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "sede_cap" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "sede_citta" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "sede_provincia" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "sede_fonte" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "esportato_il" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "esportato_file" TEXT;
