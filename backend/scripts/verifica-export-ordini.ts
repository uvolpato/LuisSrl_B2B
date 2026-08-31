/**
 * Verifica dell'export ordini B2B -> Integra, contro il DB configurato in .env.
 *
 *   npx ts-node --transpile-only scripts/verifica-export-ordini.ts            # solo dry-run
 *   EXPORT_ORDINI_DIR=C:/tmp/export npx ts-node --transpile-only scripts/verifica-export-ordini.ts --scrivi
 *
 * Il dry-run non tocca nulla: elenca cosa uscirebbe e con quale esito.
 * Con --scrivi genera i file e marca gli ordini come esportati (non reversibile
 * senza azzerare esportato_il).
 */
import 'dotenv/config';
import { PrismaService } from '../src/prisma/prisma.service';
import { ExportOrdiniService } from '../src/export-ordini/export-ordini.service';
import type { AuditService } from '../src/audit/audit.service';

async function main() {
  const scrivi = process.argv.includes('--scrivi');
  const prisma = new PrismaService();
  await prisma.$connect();

  const auditNoop = { log: async () => undefined } as unknown as AuditService;
  const svc = new ExportOrdiniService(prisma, auditNoop);

  const inCoda = await prisma.ordineCliente.count({
    where: {
      esportatoIl: null,
      numeroOrdine: { startsWith: 'B2B-' },
      stato: { in: ['BOZZA', 'ERRORE_SCRITTURA'] },
    },
  });
  console.log(`Ordini in coda: ${inCoda}`);
  console.log(`Cartella: ${process.env.EXPORT_ORDINI_DIR || '(default: <progetto>/ordini)'}`);

  console.log('\n--- DRY RUN ---');
  console.log(JSON.stringify(await svc.esportaCoda(true), null, 2));

  if (scrivi) {
    console.log('\n--- SCRITTURA REALE ---');
    console.log(JSON.stringify(await svc.esportaCoda(false), null, 2));
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
