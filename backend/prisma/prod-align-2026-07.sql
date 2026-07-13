-- ============================================================
-- Allineamento produzione allo schema Prisma (drift da db push in dev).
-- Derivato da `prisma migrate diff`, MA SENZA i DROP TABLE:
--   integra_articoli / integra_famiglie / integra_linee / integra_listini /
--   integra_listini_righe / sync_log / sync_state
-- restano perche' contengono dati Integra e sono usate via SQL raw.
-- Idempotente dove possibile. Applicare una volta:
--   psql "postgresql://postgres:PWD@localhost:5432/LuisSrlDb" -f prod-align-2026-07.sql
-- ============================================================

-- Colonne mancanti (additive) --------------------------------
ALTER TABLE "articoli" ADD COLUMN IF NOT EXISTS "descrizione" TEXT;
ALTER TABLE "articoli" ADD COLUMN IF NOT EXISTS "descrizione_dettagliata" TEXT;
ALTER TABLE "articoli" ADD COLUMN IF NOT EXISTS "prompt_ai" TEXT;
ALTER TABLE "articoli" ADD COLUMN IF NOT EXISTS "wizard_step_testi" JSONB;

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "codice_porto" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "codice_spedizione" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "codice_vettore" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "sito_web" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "telefono_fisso" TEXT;

ALTER TABLE "famiglie" ADD COLUMN IF NOT EXISTS "descrizione" TEXT;

ALTER TABLE "indirizzi_clienti" ADD COLUMN IF NOT EXISTS "codice_destinazione" TEXT;
ALTER TABLE "indirizzi_clienti" ADD COLUMN IF NOT EXISTS "codice_porto" TEXT;
ALTER TABLE "indirizzi_clienti" ADD COLUMN IF NOT EXISTS "codice_vettore" TEXT;
ALTER TABLE "indirizzi_clienti" ADD COLUMN IF NOT EXISTS "flag_abituale" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "indirizzi_clienti" ADD COLUMN IF NOT EXISTS "tipo_destinazione" TEXT;

ALTER TABLE "ordini_clienti" ADD COLUMN IF NOT EXISTS "codice_pagamento" TEXT;
ALTER TABLE "ordini_clienti" ADD COLUMN IF NOT EXISTS "codice_porto" TEXT;
ALTER TABLE "ordini_clienti" ADD COLUMN IF NOT EXISTS "codice_spedizione" TEXT;
ALTER TABLE "ordini_clienti" ADD COLUMN IF NOT EXISTS "codice_vettore" TEXT;
ALTER TABLE "ordini_clienti" ADD COLUMN IF NOT EXISTS "indirizzo_spedizione_id" INTEGER;
ALTER TABLE "ordini_clienti" ADD COLUMN IF NOT EXISTS "nota_ordine" TEXT;
ALTER TABLE "ordini_clienti" ADD COLUMN IF NOT EXISTS "nota_spedizione" TEXT;

-- Allineamento tipi (data-preserving) ------------------------
ALTER TABLE "carrelli" ALTER COLUMN "creato_il" SET DATA TYPE TIMESTAMP(3),
  ALTER COLUMN "aggiornato_il" DROP DEFAULT,
  ALTER COLUMN "aggiornato_il" SET DATA TYPE TIMESTAMP(3);
ALTER TABLE "carrello_items" ALTER COLUMN "creato_il" SET DATA TYPE TIMESTAMP(3),
  ALTER COLUMN "aggiornato_il" DROP DEFAULT,
  ALTER COLUMN "aggiornato_il" SET DATA TYPE TIMESTAMP(3);
ALTER TABLE "contatti_clienti" ALTER COLUMN "data" DROP DEFAULT,
  ALTER COLUMN "data" SET DATA TYPE TIMESTAMP(3),
  ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);
ALTER TABLE "customers" ALTER COLUMN "fido" SET DATA TYPE DECIMAL(65,30);
ALTER TABLE "ordini_clienti" ALTER COLUMN "data_ordine" SET DATA TYPE TIMESTAMP(3),
  ALTER COLUMN "importo_totale" SET DATA TYPE DECIMAL(65,30);
ALTER TABLE "prompt_templates" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
  ALTER COLUMN "updated_at" DROP DEFAULT,
  ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);
ALTER TABLE "righe_ordini" ALTER COLUMN "quantita" SET DATA TYPE DECIMAL(65,30),
  ALTER COLUMN "prezzo" SET DATA TYPE DECIMAL(65,30);
ALTER TABLE "site_config" ALTER COLUMN "updated_at" DROP DEFAULT;

-- Nuove tabelle lookup + sync_config -------------------------
CREATE TABLE IF NOT EXISTS "integra_pagamenti_descr" (
    "codice_pagamento" TEXT NOT NULL,
    "descrizione_pagamento" TEXT NOT NULL,
    "obsoleto" BOOLEAN NOT NULL DEFAULT false,
    "aggiornato_il" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "integra_pagamenti_descr_pkey" PRIMARY KEY ("codice_pagamento")
);
CREATE TABLE IF NOT EXISTS "integra_porti" (
    "codice_porto" TEXT NOT NULL,
    "descrizione_porto" TEXT NOT NULL,
    "obsoleto" BOOLEAN NOT NULL DEFAULT false,
    "aggiornato_il" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "integra_porti_pkey" PRIMARY KEY ("codice_porto")
);
CREATE TABLE IF NOT EXISTS "integra_spedizioni" (
    "codice_spedizione" TEXT NOT NULL,
    "descrizione_spedizione" TEXT NOT NULL,
    "obsoleto" BOOLEAN NOT NULL DEFAULT false,
    "aggiornato_il" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "integra_spedizioni_pkey" PRIMARY KEY ("codice_spedizione")
);
CREATE TABLE IF NOT EXISTS "integra_vettori" (
    "codice_vettore" TEXT NOT NULL,
    "descrizione" TEXT NOT NULL,
    "obsoleto" BOOLEAN NOT NULL DEFAULT false,
    "aggiornato_il" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "integra_vettori_pkey" PRIMARY KEY ("codice_vettore")
);
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
    "aggiornato_il" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sync_config_pkey" PRIMARY KEY ("tipo")
);

-- Indice unico su indirizzi (dopo aver aggiunto codice_destinazione) ---
CREATE UNIQUE INDEX IF NOT EXISTS "indirizzi_clienti_customer_id_codice_destinazione_key"
    ON "indirizzi_clienti"("customer_id", "codice_destinazione");

-- Foreign key: ricreate con ON DELETE CASCADE ----------------
ALTER TABLE "indirizzi_clienti" DROP CONSTRAINT IF EXISTS "indirizzi_clienti_customer_id_fkey";
ALTER TABLE "indirizzi_clienti" ADD CONSTRAINT "indirizzi_clienti_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contatti_clienti" DROP CONSTRAINT IF EXISTS "contatti_clienti_customer_id_fkey";
ALTER TABLE "contatti_clienti" ADD CONSTRAINT "contatti_clienti_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ordini_clienti" DROP CONSTRAINT IF EXISTS "ordini_clienti_customer_id_fkey";
ALTER TABLE "ordini_clienti" ADD CONSTRAINT "ordini_clienti_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "righe_ordini" DROP CONSTRAINT IF EXISTS "righe_ordini_ordine_id_fkey";
ALTER TABLE "righe_ordini" ADD CONSTRAINT "righe_ordini_ordine_id_fkey"
    FOREIGN KEY ("ordine_id") REFERENCES "ordini_clienti"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "immagini" DROP CONSTRAINT IF EXISTS "fk_immagini_prompt_template";
ALTER TABLE "immagini" DROP CONSTRAINT IF EXISTS "immagini_prompt_template_id_fkey";
ALTER TABLE "immagini" ADD CONSTRAINT "immagini_prompt_template_id_fkey"
    FOREIGN KEY ("prompt_template_id") REFERENCES "prompt_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "carrelli" DROP CONSTRAINT IF EXISTS "carrelli_cliente_id_fkey";
ALTER TABLE "carrelli" ADD CONSTRAINT "carrelli_cliente_id_fkey"
    FOREIGN KEY ("cliente_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "carrello_items" DROP CONSTRAINT IF EXISTS "carrello_items_carrello_id_fkey";
ALTER TABLE "carrello_items" ADD CONSTRAINT "carrello_items_carrello_id_fkey"
    FOREIGN KEY ("carrello_id") REFERENCES "carrelli"("id") ON DELETE CASCADE ON UPDATE CASCADE;
