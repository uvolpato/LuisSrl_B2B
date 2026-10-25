-- Sistema cataloghi via Brevo: cataloghi PDF, mailing, link tracciati ed eventi.
-- Additiva: solo nuove tabelle, nessuna modifica a quelle esistenti.

CREATE TABLE "cataloghi" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "pdf_file" TEXT NOT NULL,
    "copertina" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cataloghi_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mailing" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "stato" TEXT NOT NULL DEFAULT 'bozza',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mailing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mailing_catalogo" (
    "mailing_id" INTEGER NOT NULL,
    "catalogo_id" INTEGER NOT NULL,
    "ordinamento" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "mailing_catalogo_pkey" PRIMARY KEY ("mailing_id","catalogo_id")
);

CREATE TABLE "download_links" (
    "id" SERIAL NOT NULL,
    "mailing_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    CONSTRAINT "download_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "download_events" (
    "id" SERIAL NOT NULL,
    "link_id" INTEGER NOT NULL,
    "catalogo_id" INTEGER,
    "tipo" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    CONSTRAINT "download_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "download_links_token_key" ON "download_links"("token");
CREATE INDEX "download_links_mailing_id_created_at_idx" ON "download_links"("mailing_id", "created_at");
CREATE INDEX "download_events_link_id_at_idx" ON "download_events"("link_id", "at");

ALTER TABLE "mailing_catalogo" ADD CONSTRAINT "mailing_catalogo_mailing_id_fkey" FOREIGN KEY ("mailing_id") REFERENCES "mailing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mailing_catalogo" ADD CONSTRAINT "mailing_catalogo_catalogo_id_fkey" FOREIGN KEY ("catalogo_id") REFERENCES "cataloghi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "download_links" ADD CONSTRAINT "download_links_mailing_id_fkey" FOREIGN KEY ("mailing_id") REFERENCES "mailing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "download_events" ADD CONSTRAINT "download_events_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "download_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "download_events" ADD CONSTRAINT "download_events_catalogo_id_fkey" FOREIGN KEY ("catalogo_id") REFERENCES "cataloghi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
