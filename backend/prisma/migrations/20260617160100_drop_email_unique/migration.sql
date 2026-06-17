-- Rimuove i vincoli UNIQUE su email (users e customers) e partita_iva (customers)
-- perché l'unicità è già gestita dalle stored procedure, e il vincolo UNIQUE
-- impedisce di riutilizzare l'email di un utente soft-deletato.

ALTER TABLE users    DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_email_key;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_partita_iva_key;
