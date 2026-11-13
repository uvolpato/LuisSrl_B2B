-- Invito con link monouso: si conserva solo l'hash del token, con scadenza. Additiva.
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "invite_token_hash" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "invite_token_scadenza" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "customers_invite_token_hash_key" ON "customers"("invite_token_hash");
