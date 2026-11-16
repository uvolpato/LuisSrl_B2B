/**
 * Kit dimostrativo per vedere la tabella "Composizione" nel B2B e nella vetrina.
 * Usa i codici reali dell'esempio Integra (MC108886 + 4 pezzi).
 *
 * Uso:
 *   node scripts/demo-kit-composizione.cjs        # crea/aggiorna il kit e lo rende visibile
 *   node scripts/demo-kit-composizione.cjs off    # rimuove tutto
 *
 * Idempotente. Attenzione: il kit è un prodotto finto ma VISIBILE nel catalogo
 * (anche pubblico): va spento prima di un deploy o di una demo a un cliente.
 */
require('dotenv').config();
const { Client } = require('pg');

const PADRE = 'MC108886';
const PEZZI = [
  { codice: 'MC108886-08611', descrizione: 'cubo fiberstone TEXAS corten h23 23x23', dimensioni: '23x23 x 23' },
  { codice: 'MC108886-08612', descrizione: 'cubo fiberstone TEXAS corten h28 28x28', dimensioni: '28x28 x 28' },
  { codice: 'MC108886-08613', descrizione: 'cubo fiberstone TEXAS corten h30 34x34', dimensioni: '34x34 x 30' },
  { codice: 'MC108886-08614', descrizione: 'cubo fiberstone TEXAS corten h38 44x44', dimensioni: '44x44 x 38' },
];

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  if (process.argv[2] === 'off') {
    await c.query(`DELETE FROM varianti_componenti WHERE padre_codice = $1`, [PADRE]);
    await c.query(`DELETE FROM varianti WHERE codice = $1 OR codice LIKE $2`, [PADRE, `${PADRE}-%`]);
    await c.query(`DELETE FROM articoli WHERE codice_linea = $1`, [PADRE]);
    console.log(`Kit demo ${PADRE} rimosso.`);
    await c.end();
    return;
  }

  const fam = await c.query(`SELECT codice FROM famiglie WHERE stato = 'ATTIVO' ORDER BY codice LIMIT 1`);
  if (!fam.rowCount) throw new Error('Nessuna famiglia ATTIVA: attivane una prima di creare il kit demo.');

  await c.query(
    `INSERT INTO articoli (codice_linea, nome, colore, descrizione, stato, configurato, famiglia_codice, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'ATTIVO', true, $5, now(), now())
     ON CONFLICT (codice_linea) DO UPDATE
       SET nome = EXCLUDED.nome, descrizione = EXCLUDED.descrizione, stato = 'ATTIVO', configurato = true,
           famiglia_codice = EXCLUDED.famiglia_codice, updated_at = now()`,
    [
      PADRE,
      's/4 cubo fiberstone TEXAS corten',
      'corten',
      'Composizione di 4 cubi in fiberstone finitura corten, misure decrescenti: si vendono insieme.',
      fam.rows[0].codice,
    ],
  );
  const art = await c.query(`SELECT id FROM articoli WHERE codice_linea = $1`, [PADRE]);

  await c.query(
    `INSERT INTO varianti (codice, descrizione, multiplo, giacenza, stato, articolo_id, ordinamento, updated_at)
     VALUES ($1, $2, 1, 25, 'ATTIVO', $3, 0, now())
     ON CONFLICT (codice) DO UPDATE
       SET descrizione = EXCLUDED.descrizione, giacenza = EXCLUDED.giacenza, stato = 'ATTIVO',
           articolo_id = EXCLUDED.articolo_id, updated_at = now()`,
    [PADRE, 's/4 cubo fiberstone TEXAS corten h38 44x44', art.rows[0].id],
  );

  for (const [i, p] of PEZZI.entries()) {
    await c.query(
      `INSERT INTO varianti_componenti (padre_codice, codice, descrizione, dimensioni, quantita, ordinamento, updated_at)
       VALUES ($1, $2, $3, $4, 1, $5, now())
       ON CONFLICT (padre_codice, codice) DO UPDATE
         SET descrizione = EXCLUDED.descrizione, dimensioni = EXCLUDED.dimensioni,
             ordinamento = EXCLUDED.ordinamento, updated_at = now()`,
      [PADRE, p.codice, p.descrizione, p.dimensioni, 8611 + i],
    );
  }

  console.log(`Kit demo pronto: ${PADRE} in famiglia "${fam.rows[0].codice}" con ${PEZZI.length} pezzi.`);
  console.log('B2B:     http://localhost:3000/area/catalogo/' + PADRE);
  console.log('Vetrina: http://localhost:3002/catalogo?q=' + PADRE);
  await c.end();
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
