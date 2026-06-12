-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CLIENTE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ATTIVO', 'BLOCCATO');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ragione_sociale" TEXT,
    "partita_iva" TEXT,
    "telefono" TEXT,
    "ruolo" "UserRole" NOT NULL DEFAULT 'CLIENTE',
    "stato" "UserStatus" NOT NULL DEFAULT 'ATTIVO',
    "preferred_language" TEXT NOT NULL DEFAULT 'it',
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "actor_id" INTEGER,
    "azione" TEXT NOT NULL,
    "entita" TEXT,
    "entita_id" TEXT,
    "dettagli" JSONB,
    "esito" TEXT NOT NULL DEFAULT 'OK',
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "sid" TEXT NOT NULL,
    "sess" JSONB NOT NULL,
    "expire" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_partita_iva_key" ON "users"("partita_iva");

-- CreateIndex
CREATE INDEX "audit_log_azione_created_at_idx" ON "audit_log"("azione", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_actor_id_created_at_idx" ON "audit_log"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "session_expire_idx" ON "session"("expire");

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
