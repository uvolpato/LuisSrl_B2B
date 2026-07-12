-- Data di invio dell'invito B2B al cliente (null = mai invitato)
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "invitato_at" TIMESTAMP(3);
