/**
 * Pulizia una tantum dei log scritti prima della minimizzazione:
 * via la querystring (ricerche e firme), token nel path, email in chiaro nei login falliti.
 * Idempotente: alla seconda esecuzione non cambia nulla.
 *
 * Uso: node scripts/pulisci-audit-legacy.cjs
 */
const { Client } = require('pg');
require('dotenv/config');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    const r = await c.query(`
      UPDATE audit_log
         SET dettagli = jsonb_set(dettagli::jsonb, '{url}'::text[], to_jsonb('/[redatto]'::text))
       WHERE azione = 'http.access' AND dettagli ? 'url' AND left(dettagli->>'url', 1) <> '/'
    `);
    console.log(`URL non recuperabili neutralizzate: ${r.rowCount}`);

    const q = await c.query(`
      UPDATE audit_log
         SET dettagli = jsonb_set(dettagli::jsonb, '{url}'::text[], to_jsonb(split_part(dettagli->>'url', '?', 1)))
       WHERE azione = 'http.access' AND dettagli ? 'url' AND dettagli->>'url' LIKE '%?%'
    `);
    console.log(`URL con querystring pulite: ${q.rowCount}`);

    // Sostituzioni letterali (senza backreference: evita problemi di escape in SQL).
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
    console.log(`URL con token normalizzati: ${t.rowCount}`);

    const e = await c.query(`
      UPDATE audit_log SET dettagli = dettagli - 'email'
       WHERE azione = 'auth.login_failed' AND dettagli ? 'email'
    `);
    console.log(`Email in chiaro rimosse: ${e.rowCount}`);
  } finally {
    await c.end();
  }
})().catch((err) => { console.error(err); process.exit(1); });
