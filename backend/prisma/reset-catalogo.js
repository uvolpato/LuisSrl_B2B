// Elimina tutti gli articoli e le famiglie (mantiene utenti, clienti, impostazioni)
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Eliminazione in corso...");

  // Ordine corretto: prima le dipendenze
  await prisma.variante.deleteMany();
  console.log("  ✓ Varianti eliminate");

  // Immagini e raccolte hanno onDelete: Cascade su Articolo, ma eliminiamo
  // esplicitamente per sicurezza
  await prisma.immagine.deleteMany();
  console.log("  ✓ Immagini eliminate");
  await prisma.articoloRaccolta.deleteMany();
  console.log("  ✓ Relazioni raccolte eliminate");

  await prisma.articolo.deleteMany();
  console.log("  ✓ Articoli eliminati");

  await prisma.famiglia.deleteMany();
  console.log("  ✓ Famiglie eliminate");

  console.log("\nFatto. Catalogo pulito.");
}

main()
  .catch((e) => {
    console.error("ERRORE:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
