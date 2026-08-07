require('dotenv').config();
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  // setup-fdw: add foreign tables
  await c.query(`CREATE EXTENSION IF NOT EXISTS postgres_fdw`);
  await c.query(`CREATE SCHEMA IF NOT EXISTS integra`);
  
  // Server
  await c.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_foreign_server WHERE srvname = 'integra_server') THEN
        CREATE SERVER integra_server FOREIGN DATA WRAPPER postgres_fdw
        OPTIONS (host '192.168.1.41', port '5432', dbname 'integra');
      END IF;
    END $$`);
  
  // User mapping
  await c.query(`CREATE USER MAPPING IF NOT EXISTS FOR postgres SERVER integra_server OPTIONS (user 'integrams', password 'b*Y3oTcM88')`);
  
  // Import foreign tables (drop first to refresh)
  await c.query(`DROP FOREIGN TABLE IF EXISTS integra.listest CASCADE`);
  await c.query(`DROP FOREIGN TABLE IF EXISTS integra.listini CASCADE`);
  await c.query(`DROP FOREIGN TABLE IF EXISTS integra.prodotti CASCADE`);
  await c.query(`IMPORT FOREIGN SCHEMA public LIMIT TO (listest, listini, prodotti) FROM SERVER integra_server INTO integra`);
  console.log('FDW tables imported');

  // Recreate listini views
  await c.query(`DROP VIEW IF EXISTS public.b2b_listini_testata CASCADE`);
  await c.query(`CREATE VIEW public.b2b_listini_testata AS
   SELECT tls_cod AS codice_listino, tls_descr AS descrizione_listino,
    tls_obsoleto AS listino_obsoleto,
    to_timestamp(extract(epoch from tls_dtins) + tls_orains * 3600 + tls_minins * 60) AS data_inserimento,
    to_timestamp(extract(epoch from tls_dtvar) + tls_oravar * 3600 + tls_minvar * 60) AS data_modifica
   FROM integra.listest WHERE azi_cdazi = '001'`);
  
  await c.query(`DROP VIEW IF EXISTS public.b2b_listini_righe CASCADE`);
  await c.query(`CREATE VIEW public.b2b_listini_righe AS
   SELECT r.lst_id AS id_riga_listino, r.lst_tlscod AS codice_listino, r.lst_proid AS id_prodotto,
    p.pro_cod AS codice_prodotto, r.lst_varid AS id_variante,
    r.lst_prezzo AS prezzo_listino, r.lst_sconto1 AS sconto_1, r.lst_sconto2 AS sconto_2,
    r.lst_sconto3 AS sconto_3, r.lst_sconto4 AS sconto_4,
    r.lst_obsoleto AS listino_obsoleto,
    to_timestamp(extract(epoch from r.lst_dtins) + r.lst_orains * 3600 + r.lst_minins * 60) AS data_inserimento,
    to_timestamp(extract(epoch from r.lst_dtvar) + r.lst_oravar * 3600 + r.lst_minvar * 60) AS data_modifica
   FROM integra.listini r LEFT JOIN integra.prodotti p ON p.azi_cdazi = r.azi_cdazi AND p.pro_id = r.lst_proid
   WHERE r.azi_cdazi = '001' AND r.lst_obsoleto = 0 AND r.lst_progr = 1`);
  console.log('Views recreated');

  // Verify
  const r = await c.query("SELECT count(*)::int as n FROM b2b_listini_testata");
  console.log('b2b_listini_testata:', r.rows[0].n, 'listini');
  const r2 = await c.query("SELECT count(*)::int as n FROM b2b_listini_righe");
  console.log('b2b_listini_righe:', r2.rows[0].n, 'righe');

  await c.end();
})();
