/*
 * Verifica: un coupon "unlimited" gia' usato dal cliente puo' essere riutilizzato.
 *
 * Prima della fix, la conferma creava una riga campaign_usage per (campaignId,
 * customerId) a ogni ordine: al secondo uso il vincolo univoco faceva fallire la
 * transazione con HTTP 500. Ora la riga per-cliente si crea solo per i coupon "once".
 *
 * Crea un ordine reale via API (sessione vera del cliente test) con il codice coupon
 * indicato, controlla che la conferma vada a buon fine, che la riga sconto sia presente
 * e che NON venga creata una nuova riga di utilizzo. Poi cancella l'ordine, ripristina
 * il contatore usi, il carrello e le credenziali del cliente.
 *
 * Uso: node scripts/verifica-coupon-illimitato.cjs   (backend in ascolto su :3001)
 *
 * Dati di test: cliente uvolpato@gmail.com (id 2) e coupon "WWW" (illimitato, da DB).
 * L'ordine invia la mail di conferma (best-effort).
 */
require('dotenv').config();
const assert = require('node:assert');
const argon2 = require('argon2');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const BASE = process.env.BASE || 'http://localhost:3001';
const EMAIL = 'uvolpato@gmail.com';
const TEMP_PW = 'TestSped2026!';
const COUPON = process.env.COUPON || 'WWW';

const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

let sess = null;
let ordineId = null;
let snapshot = [];
let restore = null;
let campaignBase = null;

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

const SEED = [
  { varianteCodice: 'LU2091', quantita: 3, salvato: false },
  { varianteCodice: 'LU2092', quantita: 3, salvato: false },
];

async function readCart() {
  const r = await api('/carrello');
  assert.ok(r.ok, 'GET /carrello: ' + r.status);
  return (await r.json()).items.map((i) => ({ varianteCodice: i.varianteCodice, quantita: i.quantita, salvato: i.salvato }));
}

async function setCart(items) {
  for (const it of await readCart()) {
    await api(`/carrello/${encodeURIComponent(it.varianteCodice)}`, { method: 'DELETE' });
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

  const campaign = await p.campaign.findUnique({ where: { code: COUPON } });
  assert.ok(campaign, 'coupon non trovato: ' + COUPON);
  assert.strictEqual(campaign.usage, 'unlimited', 'il coupon ' + COUPON + ' non e\' illimitato (usage=' + campaign.usage + ')');
  const usageCountBase = await p.campaignUsage.count({ where: { campaignId: campaign.id, customerId: cust.id } });
  campaignBase = { id: campaign.id, usedCount: campaign.usedCount };
  console.log(`Coupon ${COUPON} (id ${campaign.id}): usage=${campaign.usage}, usi cliente=${usageCountBase}, usedCount=${campaign.usedCount}`);

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

  const cart = await (await api('/carrello')).json();
  snapshot = cart.items.map((i) => ({ varianteCodice: i.varianteCodice, quantita: i.quantita, salvato: i.salvato }));
  if (snapshot.length === 0) {
    console.log('Carrello vuoto: aggiungo articoli di test (verranno rimossi a fine script).');
    await setCart(SEED);
  }

  const dati = await (await api('/checkout/dati')).json();
  const addr = dati.indirizzi.find((a) => a.provincia && a.flagSpedizione) || dati.indirizzi.find((a) => a.provincia);
  assert.ok(addr, 'nessun indirizzo con provincia');

  const confRes = await api('/checkout/conferma', {
    method: 'POST',
    body: { modalitaConsegna: 'SPEDIZIONE', indirizzoSpedizioneId: addr.id, codiceCoupon: COUPON },
  });
  const confText = await confRes.text();
  assert.ok(confRes.ok, 'conferma ordine: ' + confRes.status + ' ' + confText);
  const ordine = JSON.parse(confText);
  ordineId = ordine.id;

  const db = await p.ordineCliente.findUnique({ where: { id: ordine.id }, include: { righe: true } });
  const rigaSconto = db.righe.find((r) => Number(r.prezzo) < 0);
  const usageCountDopo = await p.campaignUsage.count({ where: { campaignId: campaign.id, customerId: cust.id } });
  console.log('Righe ordine:', db.righe.map((r) => `${r.codiceProdotto ?? '(spedizione)'} x${r.quantita} = ${r.prezzo}`).join(' | '));

  assert.ok(rigaSconto, 'nessuna riga sconto coupon nell\'ordine');
  assert.strictEqual(usageCountDopo, usageCountBase + 1, 'non creata una nuova riga campaign_usage per coupon illimitato (' + usageCountBase + ' -> ' + usageCountDopo + ')');

  console.log(`OK: secondo uso del coupon illimitato riuscito; riga sconto ${rigaSconto.prezzo}; nuova riga di utilizzo creata (totale ${usageCountDopo}).`);
})()
  .catch((e) => {
    console.error('FALLITO:', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (ordineId) {
        await p.ordineCliente.delete({ where: { id: ordineId } });
        await p.campaignUsage.deleteMany({ where: { orderId: ordineId } });
      }
      if (campaignBase) await p.campaign.update({ where: { id: campaignBase.id }, data: { usedCount: campaignBase.usedCount } });
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
