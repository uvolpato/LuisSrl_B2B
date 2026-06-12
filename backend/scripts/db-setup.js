/**
 * Setup database portale B2B Luis.
 * Crea il DB "LuisSrlDb" se non esiste e abilita pgvector.
 * Legge la connessione da DATABASE_URL (o usa i default locali).
 * Uso: node scripts/db-setup.js
 */
const { Client } = require('pg');

const url = new URL(
  process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/LuisSrlDb',
);
const dbName = url.pathname.replace(/^\//, '') || 'LuisSrlDb';
const base = {
  host: url.hostname,
  port: Number(url.port || 5432),
  user: decodeURIComponent(url.username || 'postgres'),
  password: decodeURIComponent(url.password || 'postgres'),
};

(async () => {
  const admin = new Client({ ...base, database: 'postgres' });
  await admin.connect();
  const exists = await admin.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [dbName],
  );
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    console.log(`DB "${dbName}" creato`);
  } else {
    console.log(`DB "${dbName}" gia' esistente`);
  }
  await admin.end();

  const db = new Client({ ...base, database: dbName });
  await db.connect();
  try {
    await db.query('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('pgvector: abilitato');
  } catch (e) {
    // pgvector serve dal Blocco 4 (ricerca semantica): senza non si blocca nulla ora
    console.warn(`pgvector NON disponibile su questo server: ${e.message}`);
  }
  await db.end();
})().catch((e) => {
  console.error('ERRORE setup DB:', e.message);
  process.exit(1);
});
