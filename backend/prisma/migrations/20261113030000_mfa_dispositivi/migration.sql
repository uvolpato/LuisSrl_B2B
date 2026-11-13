-- Dispositivi fidati per la MFA: il token vive nel cookie, in DB solo l'hash. Additiva.
CREATE TABLE IF NOT EXISTS "mfa_devices" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "token_hash" TEXT NOT NULL,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3)
);

CREATE UNIQUE INDEX IF NOT EXISTS "mfa_devices_token_hash_key" ON "mfa_devices"("token_hash");
CREATE INDEX IF NOT EXISTS "mfa_devices_user_id_idx" ON "mfa_devices"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mfa_devices_user_id_fkey') THEN
    ALTER TABLE "mfa_devices"
      ADD CONSTRAINT "mfa_devices_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
