-- Fase 2 qualifica lead: esito indagine AI (additiva, idempotente).
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "verdetto" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "report" JSONB;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "indagine_il" TIMESTAMP(3);
