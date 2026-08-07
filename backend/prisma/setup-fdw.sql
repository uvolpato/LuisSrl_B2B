-- ============================================================
-- Setup Foreign Data Wrapper postgres_fdw verso il DB Integra
-- Il DB remoto (192.168.1.41/integra) viene SOLO LETTO: nessuna
-- scrittura/DDL sul remoto. Tutte le operazioni sono locali.
--
-- Uso (password non inclusa; si passa con -v):
--   psql "<DATABASE_URL>" -v pw="*Lui.2099*" -f setup-fdw.sql
--
-- Se il mapping esiste gia' e serve aggiornare la password:
--   ALTER USER MAPPING FOR postgres SERVER integra_server
--     OPTIONS (user 'postgres', password :'pw');
-- ============================================================
-- Abilita il Foreign Data Wrapper
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Schema dedicato per le foreign table di Integra
CREATE SCHEMA IF NOT EXISTS integra;

-- Definisci il server remoto
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_foreign_server WHERE srvname = 'integra_server') THEN
    CREATE SERVER integra_server
      FOREIGN DATA WRAPPER postgres_fdw
      OPTIONS (host '192.168.1.41', port '5432', dbname 'integra');
  END IF;
END
$$;

-- Mappa l'utente del portale (postgres) all'utente remoto in SOLA LETTURA
-- Le credenziali sono le stesse usate dal dblink (postgres/*Lui.2099*).
DROP USER MAPPING IF EXISTS FOR postgres SERVER integra_server;
CREATE USER MAPPING FOR postgres
  SERVER integra_server
  OPTIONS (user 'postgres', password :'pw');

-- Importa TUTTE le tabelle Integra necessarie alle viste b2b_* / FDW
IMPORT FOREIGN SCHEMA public
  LIMIT TO (classivoci, cliazi, clienti, destinazioni, entleg, listest,
            listini, maginv, maginvt, movrig, movtest, prodotti,
            tabpag, tabpor, tabspe, vettori)
  FROM SERVER integra_server
  INTO integra;

-- Leggibilita' delle foreign table per il ruolo usato dall'app (se diverso da postgres)
GRANT USAGE ON SCHEMA integra TO public;
