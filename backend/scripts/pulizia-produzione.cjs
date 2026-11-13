/**
 * Pulizia dati per la produzione (idempotente).
 * Eseguire una volta dopo il deploy delle modifiche privacy:
 *   node scripts/pulizia-produzione.cjs
 *
 * Cosa fa:
 *  1. rimuove querystring, token e email in chiaro dai log già scritti;
 *  2. azzera i referenti salvati senza fonte (nomi non verificabili);
 *  3. elimina i segreti del vecchio secondo fattore TOTP.
 *
 * Non tocca clienti, ordini, documenti né configurazioni.
 */
const { Client } = require('pg');
require('dotenv/config');

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    const q = await c.query(`
      UPDATE audit_log
         SET dettagli = jsonb_set(dettagli::jsonb, '{url}'::text[], to_jsonb(split_part(dettagli->>'url', '?', 1)))
       WHERE azione = 'http.access' AND dettagli ? 'url' AND dettagli->>'url' LIKE '%?%'
    `);
    console.log(`1) URL con querystring pulite: ${q.rowCount}`);

    const t = await c.query(`
      UPDATE audit_log
         SET dettagli = jsonb_set(dettagli::jsonb, '{url}'::text[], to_jsonb(
               CASE
                 WHEN dettagli->>'url' LIKE '/api/cataloghi/webhook/%'
                   THEN regexp_replace(dettagli->>'url', '^(/api/cataloghi/webhook)/[^/]+', '/api/cataloghi/webhook/[secret]')
                 WHEN dettagli->>'url' LIKE '/api/cataloghi/%'
                   THEN regexp_replace(dettagli->>'url', '^(/api/cataloghi)/[^/]+', '/api/cataloghi/[token]')
                 WHEN dettagli->>'url' LIKE '/api/progetti/pubblico/%'
                   THEN regexp_replace(dettagli->>'url', '^(/api/progetti/pubblico)/[^/]+', '/api/progetti/pubblico/[token]')
                 ELSE dettagli->>'url'
               END))
       WHERE azione = 'http.access' AND dettagli ? 'url'
         AND (dettagli->>'url' LIKE '/api/cataloghi/%' OR dettagli->>'url' LIKE '/api/progetti/pubblico/%')
    `);
    console.log(`2) URL con token normalizzati: ${t.rowCount}`);

    const u = await c.query(`
      UPDATE audit_log
         SET dettagli = jsonb_set(dettagli::jsonb, '{url}'::text[], to_jsonb('/[redatto]'::text))
       WHERE azione = 'http.access' AND dettagli ? 'url' AND left(dettagli->>'url', 1) <> '/'
    `);
    console.log(`3) URL non recuperabili neutralizzate: ${u.rowCount}`);

    const e = await c.query(`
      UPDATE audit_log SET dettagli = dettagli - 'email'
       WHERE azione = 'auth.login_failed' AND dettagli ? 'email'
    `);
    console.log(`4) Email in chiaro rimosse dai log: ${e.rowCount}`);

    const r = await c.query(`
      UPDATE customer_profiles
         SET contatti = '[]'::jsonb
       WHERE contatti IS NOT NULL
         AND jsonb_typeof(contatti) = 'array'
         AND jsonb_array_length(contatti) > 0
         AND NOT (contatti -> 0 ? 'fonte')
    `);
    console.log(`5) Referenti senza fonte azzerati: ${r.rowCount}`);

    const m = await c.query(`
      UPDATE users SET mfa_secret = NULL, mfa_backup_codes = NULL
       WHERE mfa_secret IS NOT NULL OR mfa_backup_codes IS NOT NULL
    `);
    console.log(`6) Segreti TOTP rimossi: ${m.rowCount}`);
  } finally {
    await c.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
