/**
 * Seed del primo amministratore. Idempotente: se l'email esiste non fa nulla.
 * Legge ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NOME da .env.
 * Passa da fn_user_create come ogni altra scrittura applicativa.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

(async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const nome = process.env.ADMIN_NOME || 'Amministratore';
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL e ADMIN_PASSWORD devono essere definiti in .env');
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    console.log(`Admin ${email} gia' presente (id ${existing.id}), nessuna modifica`);
    return;
  }

  const hash = await argon2.hash(password, { type: argon2.argon2id });
  const [user] = await prisma.$queryRaw`
    SELECT id, email FROM fn_user_create(
      NULL, ${email}, ${hash}, ${nome},
      NULL, NULL, NULL, 'ADMIN'::"UserRole", 'it', 'seed'
    )`;
  // L'admin ha scelto la password in .env: niente cambio obbligato al primo accesso
  await prisma.$queryRaw`
    SELECT id FROM fn_user_set_password(NULL, ${user.id}::int, ${hash}, false, 'seed')`;
  console.log(`Admin creato: ${user.email} (id ${user.id})`);
})()
  .catch((e) => {
    console.error('ERRORE seed:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
