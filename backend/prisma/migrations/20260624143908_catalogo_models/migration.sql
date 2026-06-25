-- CreateTable
CREATE TABLE "famiglie" (
    "codice" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codice_padre" TEXT,
    "immagine" TEXT,
    "stato" TEXT NOT NULL DEFAULT 'ATTIVO',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "famiglie_pkey" PRIMARY KEY ("codice")
);

-- CreateTable
CREATE TABLE "articoli" (
    "id" SERIAL NOT NULL,
    "codice_linea" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "colore" TEXT NOT NULL DEFAULT '',
    "descrizione_ai" TEXT,
    "stato" TEXT NOT NULL DEFAULT 'ATTIVO',
    "famiglia_codice" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articoli_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "varianti" (
    "codice" TEXT NOT NULL,
    "descrizione" TEXT NOT NULL,
    "dimensioni" JSONB,
    "multiplo" INTEGER NOT NULL DEFAULT 1,
    "giacenza" INTEGER NOT NULL DEFAULT 0,
    "stato" TEXT NOT NULL DEFAULT 'ATTIVO',
    "articolo_id" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "varianti_pkey" PRIMARY KEY ("codice")
);

-- CreateTable
CREATE TABLE "immagini" (
    "id" SERIAL NOT NULL,
    "articolo_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "ordinamento" INTEGER NOT NULL DEFAULT 0,
    "copertina" BOOLEAN NOT NULL DEFAULT false,
    "tipo" TEXT NOT NULL DEFAULT 'CARICATA',
    "prompt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "immagini_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raccolte" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "immagine" TEXT,
    "stato" TEXT NOT NULL DEFAULT 'ATTIVO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raccolte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articoli_raccolte" (
    "articolo_id" INTEGER NOT NULL,
    "raccolta_id" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "articoli_codice_linea_key" ON "articoli"("codice_linea");

-- CreateIndex
CREATE UNIQUE INDEX "raccolte_slug_key" ON "raccolte"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "articoli_raccolte_articolo_id_raccolta_id_key" ON "articoli_raccolte"("articolo_id", "raccolta_id");

-- AddForeignKey
ALTER TABLE "articoli" ADD CONSTRAINT "articoli_famiglia_codice_fkey" FOREIGN KEY ("famiglia_codice") REFERENCES "famiglie"("codice") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "varianti" ADD CONSTRAINT "varianti_articolo_id_fkey" FOREIGN KEY ("articolo_id") REFERENCES "articoli"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "immagini" ADD CONSTRAINT "immagini_articolo_id_fkey" FOREIGN KEY ("articolo_id") REFERENCES "articoli"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articoli_raccolte" ADD CONSTRAINT "articoli_raccolte_articolo_id_fkey" FOREIGN KEY ("articolo_id") REFERENCES "articoli"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articoli_raccolte" ADD CONSTRAINT "articoli_raccolte_raccolta_id_fkey" FOREIGN KEY ("raccolta_id") REFERENCES "raccolte"("id") ON DELETE CASCADE ON UPDATE CASCADE;
