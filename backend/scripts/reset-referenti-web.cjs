/**
 * Azzera i referenti salvati prima della fonte obbligatoria (nomi senza URL, quindi
 * non verificabili). I profili vengono rigenerati dalla settimana successiva.
 *
 * Idempotente: dopo il primo giro non trova più righe da toccare.
 * Uso: node scripts/reset-referenti-web.cjs
 */
const { Client } = require('pg');
require('dotenv/config');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rowCount } = await client.query(
      `UPDATE customer_profiles
          SET contatti = '[]'::jsonb
        WHERE contatti IS NOT NULL
          AND jsonb_typeof(contatti) = 'array'
          AND jsonb_array_length(contatti) > 0
          AND NOT (contatti -> 0 ? 'fonte')`,
    );
    console.log(`Referenti azzerati: ${rowCount}`);
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
