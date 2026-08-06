require('dotenv').config();
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query("INSERT INTO site_config (key, value, updated_at) VALUES ('checkout_allow_new_address', 'true', NOW()) ON CONFLICT (key) DO UPDATE SET value='true', updated_at=NOW()");
  console.log('OK');
  await c.end();
})();
