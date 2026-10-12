-- Conservazione lead (GDPR): data di anonimizzazione dei dati personali. Additiva.
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "anonimizzato_il" TIMESTAMP(3);
