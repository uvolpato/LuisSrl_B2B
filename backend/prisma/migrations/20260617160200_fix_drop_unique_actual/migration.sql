-- La migration precedente 20260617160100_drop_email_unique usava ALTER TABLE DROP CONSTRAINT
-- ma Prisma genera UNIQUE INDEX (non constraint). Drop degli indici univoci.

DROP INDEX IF EXISTS users_email_key;
DROP INDEX IF EXISTS customers_email_key;
DROP INDEX IF EXISTS customers_partita_iva_key;

-- Tenta anche il DROP INDEX per i constraint in stile Prisma su customers
-- (creati con UNIQUE inline nella CREATE TABLE, PostgreSQL genera: customers_email_key, customers_partita_iva_key)
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_email_key;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_partita_iva_key;
