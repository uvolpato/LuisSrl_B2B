require('dotenv').config();
const { Client } = require('pg');

const rows = [
  [1, 'IT', null, 3.0, 'ok', 2500, [[0,5,4.5],[5,10,3.6],[10,null,3.0]]],
  [2, 'IT', 'Lombardia', 2.5, 'ok', 3000, [[0,5,4.0],[5,10,3.2],[10,15,2.5],[15,null,2.0]]],
  [3, 'IT', 'Veneto', 2.8, 'ok', 3000, [[0,5,4.2],[5,10,3.4],[10,null,2.8]]],
  [4, 'IT', 'Piemonte', 2.6, 'ok', 3000, [[0,5,4.0],[5,10,3.2],[10,null,2.6]]],
  [5, 'IT', 'Emilia-Romagna', 3.0, 'ok', 2500, [[0,5,4.5],[5,10,3.6],[10,null,3.0]]],
  [6, 'IT', 'Toscana', 3.2, 'ok', 2500, [[0,5,4.8],[5,10,3.9],[10,null,3.2]]],
  [7, 'IT', 'Lazio', 3.4, 'ok', 2500, [[0,5,5.0],[5,10,4.0],[10,null,3.4]]],
  [8, 'IT', 'Liguria', 3.8, 'ok', 2000, [[0,5,5.5],[5,10,4.5],[10,null,3.8]]],
  [9, 'IT', 'Friuli-Venezia Giulia', 3.1, 'pausa', 2500, []],
  [10, 'IT', 'Trentino-Alto Adige', 3.3, 'pausa', null, []],
  [11, 'IT', "Valle d'Aosta", 4.0, 'configura', null, []],
  [12, 'IT', 'Marche', 3.2, 'ok', 2000, [[0,5,4.8],[5,10,3.8],[10,null,3.2]]],
  [13, 'IT', 'Umbria', 3.5, 'ok', 2000, [[0,5,5.2],[5,10,4.2],[10,null,3.5]]],
  [14, 'IT', 'Abruzzo', 3.6, 'ok', 2000, [[0,5,5.4],[5,10,4.4],[10,null,3.6]]],
  [15, 'IT', 'Molise', 4.2, 'configura', null, []],
  [16, 'IT', 'Campania', 4.0, 'ok', 2500, [[0,5,6.0],[5,10,4.9],[10,null,4.0]]],
  [17, 'IT', 'Puglia', 4.1, 'ok', 2500, [[0,5,6.1],[5,10,5.0],[10,null,4.1]]],
  [18, 'IT', 'Basilicata', 4.3, 'configura', null, []],
  [19, 'IT', 'Calabria', 4.4, 'ok', 2000, [[0,5,6.5],[5,10,5.3],[10,null,4.4]]],
  [20, 'IT', 'Sicilia', 4.5, 'ok', 2500, [[0,5,6.8],[5,10,5.5],[10,null,4.5]]],
  [21, 'IT', 'Sardegna', 4.6, 'ok', 2500, [[0,5,7.0],[5,10,5.7],[10,null,4.6]]],
  [22, 'DE', null, 3.6, 'ok', 2000, [[0,10,4.2],[10,null,3.6]]],
  [23, 'FR', null, 3.9, 'ok', 2500, [[0,10,4.6],[10,null,3.9]]],
  [24, 'ES', null, 4.2, 'ok', 2000, [[0,10,5.0],[10,null,4.2]]],
  [25, 'AT', null, 3.4, 'configura', null, []],
  [26, 'EUROPA', null, 4.0, 'ok', 2000, [[0,10,4.8],[10,null,4.0]]],
  [27, 'ROW', null, 6.0, 'ok', 1000, [[0,10,7.0],[10,null,6.0]]],
];

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  // Clean first
  await c.query('DELETE FROM tariffe_spedizione');
  for (const [id, nazione, regione, base, stato, soglia, ranges] of rows) {
    await c.query(
      `INSERT INTO tariffe_spedizione (id, nazione, regione, base_percent, stato, soglia_importo, ranges)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, nazione, regione, base, stato, soglia, JSON.stringify(ranges)],
    );
  }
  const r = await c.query('SELECT count(*)::int as c FROM tariffe_spedizione');
  await c.query("SELECT setval('tariffe_spedizione_id_seq', (SELECT COALESCE(MAX(id), 1) FROM tariffe_spedizione))");
  console.log('Seeded:', r.rows[0].c);
  await c.end();
})();
