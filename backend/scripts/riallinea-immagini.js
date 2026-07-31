/**
 * Riallinea i file immagine su disco: rimuove il prefisso intermedio
 * (_bianco_ / _galleria_ / _ai_) e rinumera progressivamente.
 *
 * Prima: ARGO_BLU_bianco_001.jpg, ARGO_BLU_galleria_001.webp, ARGO_BLU_ai_001.png
 * Dopo:  ARGO_BLU_001.jpg, ARGO_BLU_002.webp, ARGO_BLU_003.png
 *
 * Aggiorna anche il campo url nella tabella immagini per riflettere il nuovo filename.
 *
 * Uso: node scripts/riallinea-immagini.js
 */
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs/promises');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const prisma = new PrismaClient();

const ASSETS_BASE_DIR = path.resolve(
  process.env.ASSETS_BASE_DIR || path.join(__dirname, '..', '..', 'frontend', 'public', 'images'),
);
const ASSETS_PUBLIC_URL = process.env.ASSETS_PUBLIC_URL || '/images';

const EXCLUDED = new Set(['.cache', 'articoli', 'b2b', 'Famiglie']);

const RE_OLD = /^([A-Za-z0-9_-]+)_(bianco|galleria|ai)_(\d+)\.(jpg|jpeg|png|webp)$/i;

async function main() {
  console.log(`Scanning: ${ASSETS_BASE_DIR}`);
  const entries = await fs.readdir(ASSETS_BASE_DIR, { withFileTypes: true });
  let totalRenamed = 0;

  for (const entry of entries) {
    if (!entry.isDirectory() || EXCLUDED.has(entry.name)) continue;
    const cod = entry.name;
    const dirPath = path.join(ASSETS_BASE_DIR, cod);
    console.log(`\n📁 ${cod}`);

    // Leggi tutti i file immagine
    const files = await fs.readdir(dirPath);
    const oldFiles = files
      .filter((f) => RE_OLD.test(f))
      .sort();

    if (oldFiles.length === 0) {
      console.log('   → nessun file vecchio formato');
      continue;
    }

    // Trova il prossimo numero progressivo: conta file NON vecchio-formato + quelli vecchi
    const otherFiles = files.filter((f) => !RE_OLD.test(f)).length;
    let counter = otherFiles + 1;

    const renameOps = [];
    for (const oldName of oldFiles) {
      const match = oldName.match(RE_OLD);
      if (!match) continue;
      const ext = match[4];
      const padded = String(counter).padStart(3, '0');
      const newName = `${cod}_${padded}.${ext}`;
      renameOps.push({ cod, oldName, newName, counter });
      counter++;
    }

    // Esegui rename
    for (const op of renameOps) {
      const oldPath = path.join(dirPath, op.oldName);
      const newPath = path.join(dirPath, op.newName);
      if (await fs.stat(newPath).then(() => true).catch(() => false)) {
        console.warn(`   ⚠️  SALTO: ${op.newName} esiste già`);
        continue;
      }
      await fs.rename(oldPath, newPath);
      console.log(`   → ${op.oldName}  →  ${op.newName}`);

      // Aggiorna DB
      const oldUrl = `${ASSETS_PUBLIC_URL}/${op.cod}/${op.oldName}`;
      const newUrl = `${ASSETS_PUBLIC_URL}/${op.cod}/${op.newName}`;
      const img = await prisma.immagine.findFirst({ where: { url: oldUrl } });
      if (img) {
        await prisma.immagine.update({ where: { id: img.id }, data: { url: newUrl } });
        console.log(`      📝 DB #${img.id}: url aggiornato`);
      } else {
        console.warn(`      ⚠️  nessun record DB per ${oldUrl}`);
      }
    }

    totalRenamed += renameOps.length;
  }

  console.log(`\n✅ Fatto: ${totalRenamed} file rinominati.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
