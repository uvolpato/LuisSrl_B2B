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

-- Mappa l'utente del portale (postgres) all'utente remoto
CREATE USER MAPPING IF NOT EXISTS FOR postgres
  SERVER integra_server
  OPTIONS (user 'integrams', password 'b*Y3oTcM88');

-- Importa solo la vista b2b_prodotti (ex itgprodotti)
IMPORT FOREIGN SCHEMA public
  LIMIT TO (b2b_prodotti)
  FROM SERVER integra_server
  INTO integra;
