-- ============================================================================
-- Fix drift: allinea il DB a schema.prisma. Residui del refactor (split
-- users/customers) avevano lasciato il DB e lo schema disallineati.
-- Operazioni NON distruttive: i dati esistenti sono preservati
-- (tutti i clienti sono CLIENTE; users.telefono e' vuoto).
-- ============================================================================

-- 1. customers.ruolo: dal vecchio enum UserRole al corretto CustomerRole.
CREATE TYPE "CustomerRole" AS ENUM ('CLIENTE');
ALTER TABLE customers ALTER COLUMN ruolo DROP DEFAULT;
ALTER TABLE customers ALTER COLUMN ruolo TYPE "CustomerRole" USING ruolo::text::"CustomerRole";
ALTER TABLE customers ALTER COLUMN ruolo SET DEFAULT 'CLIENTE';

-- 2. Precisione timestamp come da schema (timestamp -> timestamp(3)) e
--    rimozione del default DB su updated_at (Prisma lo gestisce via @updatedAt).
ALTER TABLE customers ALTER COLUMN created_at TYPE timestamp(3);
ALTER TABLE customers ALTER COLUMN updated_at TYPE timestamp(3);
ALTER TABLE customers ALTER COLUMN updated_at DROP DEFAULT;
ALTER TABLE users ALTER COLUMN deleted_at TYPE timestamp(3);

-- 3. users.telefono: colonna residua (telefono e' un campo del cliente, non
--    dell'admin). Vuota -> rimozione sicura.
ALTER TABLE users DROP COLUMN IF EXISTS telefono;

-- 4. Rimuove il residuo di UserRole: la vecchia overload di users.fn_user_create
--    (versione pre-split, con campi cliente e p_ruolo "UserRole") e' codice
--    morto, e l'enum UserRole non e' piu' usato (users usa AdminRole).
DROP FUNCTION IF EXISTS users.fn_user_create(integer, text, text, text, text, text, text, "UserRole", text, text);
DROP TYPE IF EXISTS "UserRole";
