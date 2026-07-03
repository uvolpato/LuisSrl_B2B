/**
 * Carica l'export reale Integra (data/integra-prodotti.json, da esportazioni.xlsx)
 * nella tabella `integrazioni_raw` e ricrea le viste `vista_integra_*`.
 *
 * Uso:
 *   node scripts/seed-integra-from-export.js           # ricarica integrazioni_raw + viste
 *   node scripts/seed-integra-from-export.js --wipe    # svuota anche il catalogo portale (articoli, varianti, immagini, famiglie)
 *
 * Struttura dell'export (righe eterogenee, campo pro_tipo):
 *   - tipo 14, pro_cod "FAM_*"   → famiglia (1 nel dataset: VASI COTTO INTERNO)
 *   - tipo 14, pro_cod "linea_*" → linee; pro_proidfam = id della famiglia padre
 *   - tipo 01                    → prodotti; pro_proidfam = id della linea (o famiglia) padre
 *
 * Nota: l'export NON dichiara l'id proprio delle righe linea_*. Il collegamento
 * id-linea → riga linea viene ricostruito euristicamente confrontando le parole
 * del nome linea con le descrizioni dei prodotti del gruppo (es. i prodotti con
 * pro_proidfam=21722 sono tutti "pot cotto ARGO blu…" → linea ARGO BLU) e
 * materializzato nella tabella integrazioni_linee_map, esposta come lin_id
 * nella vista linee. Quando AGOMIR includerà l'id esplicito, la mappa si
 * sostituisce con quel campo.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const url =
  process.env.DATABASE_URL ||
  fs
    .readFileSync(path.join(__dirname, '..', '.env'), 'utf8')
    .match(/DATABASE_URL="?([^"\r\n]+)/)[1];

const rows = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'integra-prodotti.json'), 'utf8'),
);

const cols = [
  'pro_cod', 'pro_descr', 'pro_moddescr', 'pro_tipo',
  'pro_cldcod01', 'pro_clddescr01', 'pro_clvcod01',
  'pro_cldcod02', 'pro_clddescr02', 'pro_clvcod02',
  'pro_cldcod03', 'pro_clddescr03', 'pro_clvcod03',
  'pro_funzionalita1', 'pro_proidfam', 'pro_procodfam',
];

/**
 * Ricostruisce la mappa id-gruppo → riga linea. Un id è "di linea" se non è 0
 * e non è l'id di una famiglia (= gli id a cui puntano le righe linea_*).
 * Match: tutte le parole del nome linea devono comparire nelle descrizioni
 * dei prodotti del gruppo ("BLU" matcha anche "BLUE" come sottostringa).
 */
function buildLineeMap(allRows) {
  const linee = allRows.filter((r) => String(r.pro_cod).startsWith('linea_'));
  const famIds = new Set(linee.map((l) => l.pro_proidfam));
  const groups = new Map();
  for (const p of allRows.filter((r) => r.pro_tipo === '01')) {
    const id = Number(p.pro_proidfam) || 0;
    if (!id || famIds.has(id)) continue;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(p);
  }
  const used = new Set();
  const map = [];
  for (const [id, prods] of groups) {
    const blob = prods.map((p) => String(p.pro_descr).toUpperCase()).join(' ');
    let best = null;
    for (const l of linee) {
      if (used.has(l.pro_cod)) continue;
      const words = String(l.pro_descr).toUpperCase().split(/\s+/).filter(Boolean);
      if (words.length && words.every((w) => blob.includes(w))) { best = l; break; }
    }
    if (best) { map.push([id, best.pro_cod]); used.add(best.pro_cod); }
    else console.warn(`ATTENZIONE: nessuna linea abbinata al gruppo id ${id} (${prods.length} prodotti, es. "${prods[0].pro_descr}")`);
  }
  return map;
}

(async () => {
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    if (process.argv.includes('--wipe')) {
      await c.query(
        'TRUNCATE articoli_raccolte, immagini, varianti, articoli, famiglie RESTART IDENTITY CASCADE',
      );
      console.log('Catalogo portale svuotato (articoli, varianti, immagini, famiglie).');
    }

    await c.query(`
      DROP VIEW IF EXISTS vista_integra_prodotti;
      DROP VIEW IF EXISTS vista_integra_linee;
      DROP VIEW IF EXISTS vista_integra_famiglie;
      DROP TABLE IF EXISTS integrazioni_linee_map;
      DROP TABLE IF EXISTS integrazioni_raw;

      CREATE TABLE integrazioni_raw (
        pro_cod text PRIMARY KEY, pro_descr text, pro_moddescr text, pro_tipo text,
        pro_cldcod01 text, pro_clddescr01 text, pro_clvcod01 text,
        pro_cldcod02 text, pro_clddescr02 text, pro_clvcod02 text,
        pro_cldcod03 text, pro_clddescr03 text, pro_clvcod03 text,
        pro_funzionalita1 text, pro_proidfam integer, pro_procodfam text
      );
    `);

    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const values = [];
      const params = [];
      chunk.forEach((r, j) => {
        const base = j * cols.length;
        values.push(`(${cols.map((_, k) => `$${base + k + 1}`).join(',')})`);
        params.push(...cols.map((cn) => r[cn] ?? null));
      });
      await c.query(
        `INSERT INTO integrazioni_raw (${cols.join(',')}) VALUES ${values.join(',')}
         ON CONFLICT (pro_cod) DO NOTHING`,
        params,
      );
    }

    // Mappa id-gruppo → linea ricostruita euristicamente (vedi buildLineeMap)
    const lineeMap = buildLineeMap(rows);
    await c.query('CREATE TABLE integrazioni_linee_map (lin_id integer PRIMARY KEY, lin_cod text NOT NULL)');
    for (const [id, cod] of lineeMap) {
      await c.query('INSERT INTO integrazioni_linee_map (lin_id, lin_cod) VALUES ($1, $2)', [id, cod]);
    }

    // Viste con i nomi colonna attesi dal CONFIG di integrazione.service.ts.
    // ponytail: fam_id derivato dalle linee (dataset mono-famiglia); con più
    // famiglie servirà l'id famiglia esplicito nell'export.
    await c.query(`
      CREATE VIEW vista_integra_famiglie AS
        SELECT DISTINCT l.pro_proidfam AS fam_id, f.pro_cod AS fam_codice,
               f.pro_descr AS fam_descrizione, NULL::integer AS fam_parent_id
        FROM integrazioni_raw l
        CROSS JOIN (SELECT pro_cod, pro_descr FROM integrazioni_raw WHERE pro_cod LIKE 'FAM\\_%' LIMIT 1) f
        WHERE l.pro_cod LIKE 'linea\\_%';

      CREATE VIEW vista_integra_linee AS
        SELECT m.lin_id, r.pro_cod AS lin_codice, r.pro_descr AS lin_descrizione, r.pro_proidfam AS lin_famiglia_id
        FROM integrazioni_raw r
        LEFT JOIN integrazioni_linee_map m ON m.lin_cod = r.pro_cod
        WHERE r.pro_cod LIKE 'linea\\_%';

      CREATE VIEW vista_integra_prodotti AS
        SELECT pro_cod, pro_descr, pro_moddescr,
               pro_cldcod01, pro_clddescr01, pro_clvcod01,
               pro_cldcod02, pro_clddescr02, pro_clvcod02,
               pro_cldcod03, pro_clddescr03, pro_clvcod03,
               pro_funzionalita1, pro_proidfam AS pro_famiglia_id
        FROM integrazioni_raw WHERE pro_tipo = '01';
    `);

    const n = await c.query(`
      SELECT (SELECT count(*) FROM integrazioni_raw)::int AS tot,
             (SELECT count(*) FROM vista_integra_prodotti)::int AS prod,
             (SELECT count(*) FROM vista_integra_linee)::int AS lin,
             (SELECT count(*) FROM vista_integra_famiglie)::int AS fam
    `);
    const s = n.rows[0];
    console.log(`OK: integrazioni_raw ${s.tot} righe | prodotti ${s.prod} | linee ${s.lin} | famiglie ${s.fam}`);
  } finally {
    await c.end();
  }
})().catch((e) => { console.error('Errore:', e.message); process.exit(1); });
