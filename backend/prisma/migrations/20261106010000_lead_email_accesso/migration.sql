-- Email scelta a mano per l'accesso del cliente nato da una richiesta (vuoto = automatica). Additiva.
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "email_accesso" TEXT;
