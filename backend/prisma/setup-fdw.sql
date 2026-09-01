-- ============================================================
-- Setup Foreign Data Wrapper postgres_fdw verso il DB Integra
-- Il DB remoto (192.168.1.41/integra) viene SOLO LETTO: nessuna
-- scrittura/DDL sul remoto. Tutte le operazioni sono locali.
--
-- IDEMPOTENTE: rilancia quante volte vuoi (utile dopo un restore,
-- che cancella i user mapping e le foreign table).
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

-- Definisci il server remoto (e aggiorna le opzioni di performance)
DO $$
DECLARE
  srv_opts text[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_foreign_server WHERE srvname = 'integra_server') THEN
    CREATE SERVER integra_server
      FOREIGN DATA WRAPPER postgres_fdw
      OPTIONS (host '192.168.1.41', port '5432', dbname 'integra');
    srv_opts := ARRAY[]::text[];
  ELSE
    SELECT srvoptions INTO srv_opts FROM pg_foreign_server WHERE srvname='integra_server';
  END IF;

  -- Opzioni di performance: abilita pushdown join e batch fetch senza duplicarle
  IF NOT (srv_opts @> ARRAY['fetch_size=5000']) THEN
    ALTER SERVER integra_server OPTIONS (ADD fetch_size '5000');
  END IF;
  IF NOT (srv_opts @> ARRAY['use_remote_estimate=on']) THEN
    ALTER SERVER integra_server OPTIONS (ADD use_remote_estimate 'on');
  END IF;
END
$$;

-- Mappa l'utente del portale (postgres) all'utente remoto in SOLA LETTURA
-- Le credenziali sono le stesse usate dal dblink (postgres/*Lui.2099*).
DROP USER MAPPING IF EXISTS FOR CURRENT_USER SERVER integra_server;
CREATE USER MAPPING FOR CURRENT_USER
  SERVER integra_server
  OPTIONS (user 'postgres', password :'pw');

-- Importa SOLO le foreign table mancanti: IMPORT FOREIGN SCHEMA su una
-- tabella gia' esistente lancerebbe errore, e DROP romperebbe le viste
-- locali b2b_* che dipendono da esse.
DO $$
DECLARE
  t text;
  v_exists boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'classivoci', 'cliazi', 'clienti', 'destinazioni', 'entleg', 'listest',
    'listini', 'maginv', 'maginvt', 'movrig', 'movtest', 'prodotti',
    'tabpag', 'tabpor', 'tabspe', 'vettori']
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_foreign_table ft
      JOIN pg_class c ON c.oid = ft.ftrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'integra' AND c.relname = t
    ) INTO v_exists;

    IF NOT v_exists THEN
      EXECUTE format(
        'IMPORT FOREIGN SCHEMA public LIMIT TO (%I) FROM SERVER integra_server INTO integra',
        t
      );
    END IF;
  END LOOP;
END
$$;

-- Leggibilita' delle foreign table per il ruolo usato dall'app (se diverso da postgres)
GRANT USAGE ON SCHEMA integra TO public;
