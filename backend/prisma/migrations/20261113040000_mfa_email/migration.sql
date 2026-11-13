-- Secondo fattore via email (alternativo al TOTP). Additiva.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_metodo" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "otp_codice_hash" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "otp_scadenza" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "otp_tentativi" INTEGER NOT NULL DEFAULT 0;
