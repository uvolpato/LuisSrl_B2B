require('dotenv').config();
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PERMISSION_KEYS = [
  'admin.users.view',
  'admin.users.create',
  'admin.users.edit',
  'admin.users.block',
  'admin.users.delete',
  'admin.permissions.view',
  'admin.permissions.edit',
  'admin.settings.view',
  'admin.settings.edit',
  'catalog.articles.view',
  'catalog.articles.create',
  'catalog.articles.edit',
  'catalog.articles.delete',
  'catalog.famiglie.view',
  'catalog.famiglie.edit',
  'catalog.raccolte.view',
  'catalog.raccolte.edit',
  'vendite.clienti.view',
  'vendite.ordini.view',
  'vendite.ordini.edit',
  'strumenti.import.view',
  'strumenti.import.execute',
  'strumenti.ai.view',
];

const READ_ONLY_KEYS = PERMISSION_KEYS.filter((k) => k.endsWith('.view'));

const AVATAR_COLORS = [
  'oklch(55% 0.18 25)',
  'oklch(55% 0.15 250)',
  'oklch(55% 0.16 100)',
  'oklch(55% 0.15 160)',
  'oklch(55% 0.14 300)',
  'oklch(55% 0.17 40)',
  'oklch(55% 0.15 200)',
  'oklch(55% 0.13 350)',
  'oklch(55% 0.16 280)',
  'oklch(55% 0.14 80)',
];

function randomAvatarColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

(async () => {
  // ── Gruppo Amministratore ──
  let groupAdmin = await prisma.permissionGroup.findUnique({ where: { slug: 'super-admin' } });
  if (!groupAdmin) {
    groupAdmin = await prisma.permissionGroup.create({
      data: { name: 'Amministratore', slug: 'super-admin', permissions: PERMISSION_KEYS },
    });
    console.log(`Gruppo "Amministratore" creato (id ${groupAdmin.id})`);
  } else {
    groupAdmin = await prisma.permissionGroup.update({
      where: { id: groupAdmin.id },
      data: { permissions: PERMISSION_KEYS },
    });
    console.log(`Gruppo "Amministratore" aggiornato (id ${groupAdmin.id})`);
  }

  // ── Gruppo Visualizzatore ──
  let groupViewer = await prisma.permissionGroup.findUnique({ where: { slug: 'viewer' } });
  if (!groupViewer) {
    groupViewer = await prisma.permissionGroup.create({
      data: { name: 'Visualizzatore', slug: 'viewer', permissions: READ_ONLY_KEYS },
    });
    console.log(`Gruppo "Visualizzatore" creato (id ${groupViewer.id})`);
  } else {
    groupViewer = await prisma.permissionGroup.update({
      where: { id: groupViewer.id },
      data: { permissions: READ_ONLY_KEYS },
    });
    console.log(`Gruppo "Visualizzatore" aggiornato (id ${groupViewer.id})`);
  }

  // ── Utente admin SUPERUSER ──
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const nome = process.env.ADMIN_NOME || 'Amministratore';
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL e ADMIN_PASSWORD devono essere definiti in .env');
  }

  const normalizedEmail = email.toLowerCase();
  let admin = await prisma.user.findFirst({ where: { email: normalizedEmail } });
  if (!admin) {
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    admin = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: hash,
        nome,
        ruolo: 'SUPERUSER',
        preferredLanguage: 'it',
        stato: 'ATTIVO',
        groupId: groupAdmin.id,
        avatarColor: randomAvatarColor(),
      },
    });
    console.log(`Admin creato: ${admin.email} (id ${admin.id})`);
  } else {
    console.log(`Admin ${email} gia' presente (id ${admin.id})`);
  }

  // ── Assicura SUPERUSER + gruppo ──
  if (admin.ruolo !== 'SUPERUSER' || admin.groupId !== groupAdmin.id) {
    await prisma.user.update({
      where: { id: admin.id },
      data: { ruolo: 'SUPERUSER', groupId: groupAdmin.id },
    });
    console.log(`Admin ${email} impostato come SUPERUSER + gruppo Amministratore`);
  }

  // ── SuggestionBox: seed dei 6 box dashboard (gli attuali hardcoded) ──
  const DEFAULT_PESI = { acquisti: 0.4, tracking: 0.25, progetti: 0.2, affinita: 0.15 };
  const boxSeeds = [
    {
      titolo: 'Riprendi da dove hai lasciato',
      prompt:
        'prendi gli articoli che il cliente ha visto o salvato di recente o che ha nei suoi progetti, in ordine di interesse, con giacenza disponibile',
      nArticoli: 10,
      pesi: { acquisti: 0.2, tracking: 0.4, progetti: 0.3, affinita: 0.1 },
      soloInOfferta: false,
      escludiAcquistati: true,
      ordinamento: 1,
    },
    {
      titolo: 'I tuoi prodotti in offerta',
      prompt: 'prendi gli articoli in offerta che corrispondono alle famiglie preferite del cliente',
      nArticoli: 10,
      pesi: DEFAULT_PESI,
      soloInOfferta: true,
      escludiAcquistati: true,
      ordinamento: 2,
    },
    {
      titolo: 'Offerte relative ai prodotti salvati',
      prompt:
        'prendi gli articoli in offerta simili a quelli che il cliente ha salvato o ha nei progetti',
      nArticoli: 10,
      pesi: { acquisti: 0.3, tracking: 0.3, progetti: 0.25, affinita: 0.15 },
      soloInOfferta: true,
      escludiAcquistati: true,
      ordinamento: 3,
    },
    {
      titolo: 'Offerte Top',
      prompt: 'prendi gli articoli in offerta più venduti, adatti agli interessi del cliente',
      nArticoli: 10,
      pesi: DEFAULT_PESI,
      soloInOfferta: true,
      escludiAcquistati: true,
      ordinamento: 4,
    },
    {
      titolo: 'Offerte di oggi',
      prompt: 'prendi gli articoli in offerta con la scadenza più vicina',
      nArticoli: 10,
      pesi: DEFAULT_PESI,
      soloInOfferta: true,
      escludiAcquistati: true,
      ordinamento: 5,
    },
    {
      titolo: 'Offerte stagionali',
      prompt: 'prendi gli articoli in offerta stagionali in linea con gli acquisti del cliente',
      nArticoli: 10,
      pesi: DEFAULT_PESI,
      soloInOfferta: true,
      escludiAcquistati: true,
      ordinamento: 6,
    },
  ];

  for (const b of boxSeeds) {
    const esistente = await prisma.suggestionBox.findFirst({ where: { titolo: b.titolo } });
    if (!esistente) {
      await prisma.suggestionBox.create({
        data: {
          titolo: b.titolo,
          prompt: b.prompt,
          nArticoli: b.nArticoli,
          pesi: b.pesi,
          soloInOfferta: b.soloInOfferta,
          escludiAcquistati: b.escludiAcquistati,
          ordinamento: b.ordinamento,
        },
      });
      console.log(`SuggestionBox creato: "${b.titolo}"`);
    } else {
      console.log(`SuggestionBox gia' presente: "${b.titolo}" (id ${esistente.id})`);
    }
  }

  // ── Clienti seed ──
  const customerSeeds = [
    { email: 'uvolpato+cliente1@gmail.com', password: 'Cliente2026!', nome: 'Marco', ragioneSociale: 'Fiorista Rossi SNC', partitaIva: '01234567890', telefono: '0351234567' },
    { email: 'uvolpato+verdegiardini@gmail.com', password: 'Cliente2026!', nome: 'Luigi', ragioneSociale: 'Verde Giardini SRL', partitaIva: '09876543210', telefono: '0359876543' },
  ];

  for (const c of customerSeeds) {
    const normEmail = c.email.toLowerCase();
    let existing = await prisma.customer.findFirst({ where: { email: normEmail } });
    if (!existing) {
      const hash = await argon2.hash(c.password, { type: argon2.argon2id });
      const customer = await prisma.customer.create({
        data: {
          email: normEmail,
          passwordHash: hash,
          nome: c.nome,
          ragioneSociale: c.ragioneSociale,
          partitaIva: c.partitaIva,
          telefono: c.telefono,
          stato: 'ATTIVO',
          ruolo: 'CLIENTE',
          preferredLanguage: 'it',
          avatarColor: randomAvatarColor(),
        },
      });
      console.log(`Cliente creato: ${c.email} (id ${customer.id})`);
    } else {
      console.log(`Cliente ${c.email} gia' presente (id ${existing.id})`);
    }
  }
})()
  .catch((e) => {
    console.error('ERRORE seed:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

