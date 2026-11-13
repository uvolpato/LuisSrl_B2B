-- Privacy/GDPR: prova dell'informativa, opposizione al tracciamento, pseudonimizzazione,
-- base del marketing. Additiva e idempotente.

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "privacy_versione" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "privacy_accettata_il" TIMESTAMP(3);
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "tracking_opt_out" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "dati_personali_rimossi_il" TIMESTAMP(3);

ALTER TABLE "download_links" ADD COLUMN IF NOT EXISTS "consenso_marketing" TIMESTAMP(3);
ALTER TABLE "download_links" ADD COLUMN IF NOT EXISTS "fonte_consenso" TEXT;
ALTER TABLE "download_links" ADD COLUMN IF NOT EXISTS "escluso" BOOLEAN NOT NULL DEFAULT false;
