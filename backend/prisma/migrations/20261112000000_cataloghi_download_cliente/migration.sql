-- Collega i link dei cataloghi ai clienti B2B (oltre che all'email). Additiva.
ALTER TABLE "download_links" ADD COLUMN IF NOT EXISTS "customer_id" INTEGER;
CREATE INDEX IF NOT EXISTS "download_links_customer_id_idx" ON "download_links"("customer_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'download_links_customer_id_fkey') THEN
    ALTER TABLE "download_links"
      ADD CONSTRAINT "download_links_customer_id_fkey"
      FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Storico: collega i link gia' esistenti quando l'email corrisponde a un solo cliente.
UPDATE "download_links" l
SET "customer_id" = c."id"
FROM (
  SELECT lower(email) AS mail, MIN(id) AS id
  FROM "customers"
  GROUP BY lower(email)
  HAVING count(*) = 1
) c
WHERE l."customer_id" IS NULL AND lower(l."email") = c.mail;
