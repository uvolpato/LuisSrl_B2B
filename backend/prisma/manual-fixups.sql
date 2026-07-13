-- ============================================================
-- Fixup manuali NON coperti dalle migration Prisma.
-- Oggetti aggiunti allo schema ma mai migrati correttamente
-- (in dev applicati a mano). IDEMPOTENTE: rieseguibile senza danni.
--
-- Uso in produzione:
--   psql "postgresql://postgres:PWD@localhost:5432/LuisSrlDb" -f manual-fixups.sql
-- ============================================================

-- 1) Tabella site_config (modello SiteConfig) -----------------
CREATE TABLE IF NOT EXISTS site_config (
  id          SERIAL PRIMARY KEY,
  key         TEXT NOT NULL,
  value       TEXT NOT NULL,
  created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS site_config_key_key ON site_config(key);

-- 2) Colonne mancanti su raccolte ------------------------------
ALTER TABLE "raccolte" ADD COLUMN IF NOT EXISTS "descrizione" TEXT;
ALTER TABLE "raccolte" ADD COLUMN IF NOT EXISTS "sconto" DOUBLE PRECISION;

-- 3) Config sincronizzazioni Integra (tabella + righe di default) --
-- Senza queste righe: nessun bottone di sync e nessun cron registrato.
CREATE TABLE IF NOT EXISTS "sync_config" (
    "tipo" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "cron_expression" TEXT NOT NULL,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "solo_manuale" BOOLEAN NOT NULL DEFAULT false,
    "ultima_esecuzione" TIMESTAMP(3),
    "ultimo_esito" TEXT,
    "ultimo_errore" TEXT,
    "prossima_esecuzione" TIMESTAMP(3),
    "creato_il" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggiornato_il" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sync_config_pkey" PRIMARY KEY ("tipo")
);
-- cron a 6 campi (con secondi), pacchetto "cron". Modificabili poi dal pannello.
INSERT INTO "sync_config" (tipo, label, cron_expression, attivo, solo_manuale, aggiornato_il) VALUES
('giacenze', 'Giacenze',  '0 */15 * * * *', true,  false, NOW()),
('articoli', 'Articoli',  '0 0 */6 * * *',  true,  false, NOW()),
('listini',  'Listini',   '0 0 * * * *',    true,  false, NOW()),
('ordini',   'Ordini',    '0 */15 * * * *', true,  false, NOW())
ON CONFLICT (tipo) DO NOTHING;

-- 4) Chiavi di configurazione AI di default --------------------
INSERT INTO site_config (key, value, updated_at) VALUES
('AI_Immagini_Provider', 'gemini', NOW()),
('AI_Immagini_Modello', 'gemini-2.5-flash-image', NOW()),
('AI_Immagini_Temperature', '0.4', NOW()),
('AI_Immagini_MaxTokens', '4096', NOW()),
('AI_Testi_Provider', 'gemini', NOW()),
('AI_Testi_Modello', 'gemini-2.5-flash', NOW()),
('AI_Testi_Endpoint', 'https://generativelanguage.googleapis.com/v1beta/models/', NOW()),
('AI_Testi_Temperature', '0.7', NOW()),
('AI_Testi_MaxTokens', '8192', NOW())
ON CONFLICT (key) DO NOTHING;
