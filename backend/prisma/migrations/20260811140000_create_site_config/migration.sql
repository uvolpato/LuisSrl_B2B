-- Crea la tabella site_config (modello SiteConfig) nella catena migration.
-- Prima era creata solo da prisma/manual-fixups.sql, fuori dalla catena: questo
-- faceva fallire la migration successiva "banner_spedizione_config" (INSERT INTO site_config)
-- nel replay dello shadow database. Idempotente: in produzione la tabella esiste già.
CREATE TABLE IF NOT EXISTS "site_config" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "site_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "site_config_key_key" ON "site_config"("key");
