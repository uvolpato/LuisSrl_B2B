/**
 * Cambia email e/o password del SUPERUSER (l'admin principale del portale).
 *
 * NON crea un secondo account: aggiorna la riga SUPERUSER esistente, così la
 * mail cambia sull'account che c'è già (il seed invece ne creerebbe uno nuovo).
 * Dopo il cambio azzera `session_token`: tutte le sessioni admin aperte vengono
 * invalidate e serve rifare login con le nuove credenziali.
 *
 * I nuovi valori si passano da variabili d'ambiente a runtime (mai hardcodati
 * nel repo). Se NEW_ADMIN_PASSWORD manca, ne genera una forte e la stampa UNA
 * volta sola: va copiata subito.
 *
 * Uso (PowerShell):
 *   $env:NEW_ADMIN_EMAIL="nuova@dominio.it"; $env:NEW_ADMIN_PASSWORD="LaTuaPwdForte"; node scripts/cambia-superuser.js
 *   # oppure, password generata dallo script:
 *   $env:NEW_ADMIN_EMAIL="nuova@dominio.it"; node scripts/cambia-superuser.js
 *
 * Idempotente: rieseguibile. Legge DATABASE_URL da .env (occhio a QUALE DB punta:
 * dev locale vs produzione).
 */
require('dotenv').config();
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const { randomBytes } = require('crypto');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function generaPassword() {
  // 18 char base64url: ~108 bit di entropia.
  return randomBytes(14).toString('base64').replace(/[+/=]/g, '').slice(0, 18) + 'A1!';
}

async function main() {
  const newEmailRaw = process.env.NEW_ADMIN_EMAIL;
  let newPassword = process.env.NEW_ADMIN_PASSWORD;
  const newNome = process.env.NEW_ADMIN_NOME; // opzionale

  if (!newEmailRaw && !newPassword) {
    throw new Error('Serve almeno NEW_ADMIN_EMAIL o NEW_ADMIN_PASSWORD.');
  }
  if (newEmailRaw && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmailRaw)) {
    throw new Error(`Email non valida: ${newEmailRaw}`);
  }
  let generata = false;
  if (!newPassword) {
    newPassword = generaPassword();
    generata = true;
  }
  if (newPassword.length < 12) {
    throw new Error('Password troppo corta: minimo 12 caratteri per un account SUPERUSER.');
  }

  // Trova l'unico SUPERUSER (deve essere esattamente uno).
  const superusers = await prisma.user.findMany({ where: { ruolo: 'SUPERUSER' } });
  if (superusers.length === 0) throw new Error('Nessun SUPERUSER trovato.');
  if (superusers.length > 1) {
    throw new Error(
      `Trovati ${superusers.length} SUPERUSER (id: ${superusers.map((u) => u.id).join(', ')}). ` +
        'Ambiguo: risolvere manualmente prima di procedere.',
    );
  }
  const su = superusers[0];
  console.log(`SUPERUSER attuale: id=${su.id} email=${su.email} nome=${su.nome}`);

  const data = {
    passwordHash: await argon2.hash(newPassword, { type: argon2.argon2id }),
    mustChangePassword: false,
    sessionToken: null, // invalida le sessioni aperte -> forza il re-login
  };
  const normalizedEmail = newEmailRaw ? newEmailRaw.toLowerCase() : su.email;
  if (newEmailRaw) {
    const normalized = newEmailRaw.toLowerCase();
    // Nessun altro account (admin o cliente) deve avere quell'email.
    const clashUser = await prisma.user.findFirst({ where: { email: normalized, id: { not: su.id } } });
    if (clashUser) throw new Error(`Email già usata da un altro admin (id ${clashUser.id}).`);
    const clashCustomer = await prisma.customer.findFirst({ where: { email: normalized } });
    if (clashCustomer) throw new Error(`Email già usata da un cliente (id ${clashCustomer.id}).`);
    data.email = normalized;
  }
  if (newNome) data.nome = newNome;

  await prisma.user.update({ where: { id: su.id }, data });

  console.log('─'.repeat(50));
  console.log('SUPERUSER aggiornato:');
  console.log(`  email: ${normalizedEmail}`);
  if (newNome) console.log(`  nome:  ${newNome}`);
  if (generata) {
    console.log(`  password (GENERATA, copiala ora): ${newPassword}`);
  } else {
    console.log('  password: (quella fornita in NEW_ADMIN_PASSWORD)');
  }
  console.log('  sessioni admin aperte: invalidate (rifare login).');
  console.log('─'.repeat(50));
}

main()
  .catch((e) => {
    console.error('ERRORE:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
