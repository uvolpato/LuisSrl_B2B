-- ============================================================
-- Setup Foreign Data Wrapper postgres_fdw verso il DB Integra
-- PRODUZIONE: entrambi i DB sullo stesso server (localhost).
-- Il DB Integra viene SOLO LETTO: nessuna scrittura/DDL.
--
-- Uso (senza password, trust/peer su localhost):
--   psql "<DATABASE_URL>" -f setup-fdw-prod.sql
--
-- Se serve password (es. utente dedicato):
--   psql "<DATABASE_URL>" -v pw="xxx" -f setup-fdw-prod.sql
-- ============================================================

-- Abilita il Foreign Data Wrapper
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Schema dedicato per le foreign table di Integra
CREATE SCHEMA IF NOT EXISTS integra;

-- Definisci il server remoto (stesso server, DB integra)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_foreign_server WHERE srvname = 'integra_server') THEN
    CREATE SERVER integra_server
      FOREIGN DATA WRAPPER postgres_fdw
      OPTIONS (host 'localhost', port '5432', dbname 'integra');
  END IF;
END
$$;

-- Opzioni di performance: abilita pushdown dei join e batch fetch
ALTER SERVER integra_server
  OPTIONS (ADD fetch_size '5000', ADD use_remote_estimate 'on');

-- Mappa l'utente locale al DB Integra (stesso server, trust/peer)
-- Se serve password passarla con -v pw="xxx"
DROP USER MAPPING IF EXISTS FOR CURRENT_USER SERVER integra_server;
CREATE USER MAPPING FOR CURRENT_USER
  SERVER integra_server
  OPTIONS (user 'postgres', password :'pw' || '');

-- Importa TUTTE le tabelle Integra necessarie alle viste b2b_* / FDW
IMPORT FOREIGN SCHEMA public
  LIMIT TO (classivoci, cliazi, clienti, destinazioni, entleg, listest,
            listini, maginv, maginvt, movrig, movtest, prodotti,
            tabpag, tabpor, tabspe, vettori)
  FROM SERVER integra_server
  INTO integra;

-- Leggibilita' delle foreign table per il ruolo usato dall'app
GRANT USAGE ON SCHEMA integra TO public;
