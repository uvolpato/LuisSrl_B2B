/**
 * Fissa il codice cliente della anagrafica da scrivere nell'export ordini B2B.
 *
 * Il cliente che genera gli ordini B2B di test deve risultare, nel campo
 * anagrafica `customers.codice_cliente`, col codice 07413 (quello che
 * l'Integra si aspetta nell'export, colonna F / mvt_clacodstr).
 *
 * Idempotente: rieseguibile senza effetti se già applicato.
 * NON tocca le righe di `integra_clienti` (fonte read-only).
 */
const { Client } = require('pg');

const NEW_CODE = '07413';
const OLD_CODE = '08918';

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  // Identifica i clienti che hanno creato ordini B2B (numerazione B2B-*).
  const b2b = await c.query(
    `SELECT DISTINCT customer_id FROM ordini_clienti
     WHERE numero_ordine LIKE 'B2B-%' AND customer_id IS NOT NULL`,
  );
  const ids = (b2b.rows || []).map((r) => r.customer_id);
  console.log('customer coinvolti in ordini B2B:', JSON.stringify(ids));
  if (ids.length !== 1) {
    throw new Error(`attesi esattamente 1 customer B2B, trovati ${ids.length}: ${JSON.stringify(ids)}`);
  }
  const targetId = ids[0];

  const cur = await c.query(
    `SELECT id, ragione_sociale, email, codice_cliente FROM customers WHERE id = $1`,
    [targetId],
  );
  if (cur.rowCount !== 1) throw new Error(`customer ${targetId} non trovato`);
  const cus = cur.rows[0];
  console.log('cliente di riferimento:', JSON.stringify(cus));

  if (cus.codice_cliente === NEW_CODE) {
    console.log(`OK: ${cus.ragione_sociale} ha già codice ${NEW_CODE}, nessuna modifica.`);
    await c.end();
    return;
  }
  if (cus.codice_cliente !== OLD_CODE) {
    throw new Error(`codice attuale inatteso (${cus.codice_cliente}), non tocco nulla`);
  }

  const clash = await c.query(`SELECT id, ragione_sociale FROM customers WHERE codice_cliente = $1`, [NEW_CODE]);
  if (clash.rowCount > 0) {
    throw new Error(`${NEW_CODE} già assegnato a customer ${JSON.stringify(clash.rows[0])}`);
  }

  const upd = await c.query(
    `UPDATE customers SET codice_cliente = $1, updated_at = now()
     WHERE id = $2 AND codice_cliente = $3 AND NOT EXISTS (
       SELECT 1 FROM customers WHERE codice_cliente = $1
     ) RETURNING id, codice_cliente`,
    [NEW_CODE, targetId, OLD_CODE],
  );
  if (upd.rowCount === 1) {
    console.log(`OK: customer ${targetId} → codice_cliente ${NEW_CODE}`);
  } else {
    throw new Error('UPDATE non applicato: condizione attesa non verificata');
  }
  await c.end();
}

main().catch((e) => {
  console.error('ERRORE:', e.message);
  process.exit(1);
});