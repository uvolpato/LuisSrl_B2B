/*
 * Verifica: il costo di spedizione entra nell'ordine come RIGA (non come campo),
 * cosi' totale e riepiloghi (cliente e admin) restano automaticamente coerenti.
 *
 * Crea un ordine reale via API (sessione vera del cliente test), controlla che
 * esista una riga "Spese di spedizione" senza codice prodotto e che
 * importo_totale == somma delle righe (spedizione inclusa). Poi cancella l'ordine
 * e ripristina carrello e credenziali del cliente.
 *
 * Uso: node scripts/verifica-costo-trasporto.cjs   (backend in ascolto su :3001)
 *
 * Dati di test: cliente uvolpato@gmail.com (id 2). La password viene sostituita
 * temporaneamente e ripristinata a fine script; l'ordine creato viene eliminato.
 * Nota: l'ordine invia la mail di conferma (best-effort).
 */
require('dotenv').config();
const assert = require('node:assert');
const argon2 = require('argon2');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const BASE = process.env.BASE || 'http://localhost:3001';
const EMAIL = 'uvolpato@gmail.com';
const TEMP_PW = 'TestSped2026!';

const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

let sess = null;
let ordineId = null;
let snapshot = [];
let restore = null;

function cookiesFrom(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
  return raw.filter(Boolean).map((c) => c.split(';')[0]).join('; ');
}

function api(path, { method = 'GET', body } = {}) {
  return fetch(BASE + '/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: sess.cookie, 'x-csrf-token': sess.csrf },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Prodotti usati solo se il carrello e' vuoto, per poter confermare un ordine.
const SEED = [
  { varianteCodice: 'LU2091', quantita: 3, salvato: false },
  { varianteCodice: 'LU2092', quantita: 3, salvato: false },
];

async function readCart() {
  const r = await api('/carrello');
  assert.ok(r.ok, 'GET /carrello: ' + r.status);
  const c = await r.json();
  return c.items.map((i) => ({ varianteCodice: i.varianteCodice, quantita: i.quantita, salvato: i.salvato }));
}

// Riporta il carrello esattamente a `items` (svuota e ricrea). Usa la sessione attiva.
async function setCart(items) {
  for (const it of await readCart()) {
    const r = await api(`/carrello/${encodeURIComponent(it.varianteCodice)}`, { method: 'DELETE' });
    if (!r.ok) console.error('svuotamento carrello fallito', it.varianteCodice, r.status);
  }
  for (const it of items) {
    const r = await api('/carrello', { method: 'POST', body: { varianteCodice: it.varianteCodice, quantita: it.quantita } });
    if (!r.ok) console.error('ripristino carrello fallito', it.varianteCodice, r.status);
    else if (it.salvato) await api(`/carrello/${encodeURIComponent(it.varianteCodice)}/salva`, { method: 'PATCH' });
  }
}

(async () => {
  const cust = await p.customer.findFirst({
    where: { email: EMAIL },
    select: { id: true, passwordHash: true, sessionToken: true, stato: true, ruolo: true, mustChangePassword: true },
  });
  assert.ok(cust, 'cliente test non trovato');
  restore = cust;
  await p.customer.update({
    where: { id: cust.id },
    data: { passwordHash: await argon2.hash(TEMP_PW, { type: argon2.argon2id }) },
  });

  const li = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: TEMP_PW }),
  });
  const liText = await li.text();
  assert.ok(li.ok, 'login fallito: ' + li.status + ' ' + liText);
  sess = { cookie: cookiesFrom(li), csrf: JSON.parse(liText).csrfToken };

  const cartRes = await api('/carrello');
  assert.ok(cartRes.ok, 'GET /carrello: ' + cartRes.status);
  const cart = await cartRes.json();
  snapshot = cart.items.map((i) => ({ varianteCodice: i.varianteCodice, quantita: i.quantita, salvato: i.salvato }));
  if (snapshot.length === 0) {
    console.log('Carrello vuoto: aggiungo articoli di test (verranno rimossi a fine script).');
    await setCart(SEED);
    const seeded = await api('/carrello');
    cart.items = (await seeded.json()).items;
  }

  const dati = await (await api('/checkout/dati')).json();
  const addr = dati.indirizzi.find((a) => a.provincia && a.flagSpedizione) || dati.indirizzi.find((a) => a.provincia);
  assert.ok(addr, 'nessun indirizzo con provincia');

  const imponibile = cart.items.reduce((s, i) => s + i.quantita * (i.prezzo?.prezzoNetto ?? 0), 0);
  const sp = await (await api(`/checkout/spedizione?provincia=${addr.provincia}&nazione=${addr.nazione ?? 'IT'}&imponibile=${imponibile}&sconto=0`)).json();
  console.log('Spedizione (endpoint):', sp.importo, sp.descrizione);

  const confRes = await api('/checkout/conferma', {
    method: 'POST',
    body: { modalitaConsegna: 'SPEDIZIONE', indirizzoSpedizioneId: addr.id },
  });
  const confText = await confRes.text();
  assert.ok(confRes.ok, 'conferma ordine: ' + confRes.status + ' ' + confText);
  const ordine = JSON.parse(confText);
  ordineId = ordine.id;

  const db = await p.ordineCliente.findUnique({ where: { id: ordine.id }, include: { righe: true } });
  const righeSum = Math.round(db.righe.reduce((s, r) => s + Number(r.quantita) * Number(r.prezzo), 0) * 100) / 100;
  const tot = Number(db.importoTotale ?? 0);

  const sped = db.righe.find((r) => !(r.codiceProdotto ?? '').trim());
  console.log('Righe ordine:', db.righe.map((r) => `${r.codiceProdotto ?? '(spedizione)'} x${r.quantita} = ${r.prezzo}`).join(' | '));
  console.log('Persistito:', { numero: db.numeroOrdine, righeSum, importoTotale: tot });

  assert.ok(sped, 'nessuna riga di spedizione (codice prodotto vuoto) nell\'ordine');
  assert.strictEqual(Number(sped.prezzo), Number(sp.importo), 'importo riga spedizione != tariffa calcolata');
  assert.ok(Number(sped.prezzo) > 0, 'importo riga spedizione non positivo');
  assert.strictEqual(tot, righeSum, 'importo_totale != somma delle righe (spedizione non inclusa?)');
  assert.strictEqual(Number(ordine.importoTotale), tot, 'risposta conferma != importo persistito');

  console.log(`OK: riga spedizione ${Number(sped.prezzo)} inclusa; totale = somma righe = ${tot}`);
})()
  .catch((e) => {
    console.error('FALLITO:', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (ordineId) await p.ordineCliente.delete({ where: { id: ordineId } });
      // Riporta il carrello esattamente com'era all'inizio (anche se era vuoto).
      if (sess && snapshot) await setCart(snapshot);
      if (restore) {
        await p.customer.update({
          where: { id: restore.id },
          data: {
            passwordHash: restore.passwordHash,
            sessionToken: restore.sessionToken,
            stato: restore.stato,
            ruolo: restore.ruolo,
            mustChangePassword: restore.mustChangePassword,
          },
        });
      }
    } catch (e) {
      console.error('cleanup errore:', e.message);
      process.exitCode = 1;
    }
    await p.$disconnect();
  });
