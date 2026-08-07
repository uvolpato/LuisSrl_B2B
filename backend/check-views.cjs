require('dotenv').config();
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    const r = await c.query("SELECT count(*)::int as n FROM b2b_listini_testata");
    console.log('b2b_listini_testata:', r.rows[0].n);
  } catch(e) {
    console.log('ERRORE testata:', e.message.substring(0, 200));
  }
  try {
    const r = await c.query("SELECT count(*)::int as n FROM b2b_listini_righe");
    console.log('b2b_listini_righe:', r.rows[0].n);
  } catch(e) {
    console.log('ERRORE righe:', e.message.substring(0, 200));
  }
  await c.end();
})();
