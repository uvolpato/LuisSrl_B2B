/**
 * Backfill embedding articoli per la ricerca semantica.
 * Idempotente: reembedArticolo salta gli articoli con blob invariato (fonte_hash).
 * Rilanciabile in sicurezza.
 *
 *   npx ts-node scripts/backfill-embeddings.ts
 *
 * Prerequisiti: embedding-setup.sql applicato, GEMINI_API_KEY (o EMBEDDINGS_* per Mini PC) in .env.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { IntegrazioneService } from '../src/integrazione/integrazione.service';
import { PrismaService } from '../src/prisma/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const svc = app.get(IntegrazioneService);

  const arts = await prisma.articolo.findMany({
    where: { configurato: true, stato: 'ATTIVO', famiglia: { stato: 'ATTIVO' } },
    select: { codiceLinea: true },
    orderBy: { id: 'asc' },
  });
  console.log(`Articoli visibili da indicizzare: ${arts.length}`);

  let done = 0, fail = 0;
  for (const a of arts) {
    try {
      await svc.reembedArticolo(a.codiceLinea);
    } catch (e) {
      fail++;
      console.warn(`  ✗ ${a.codiceLinea}: ${(e as Error).message}`);
    }
    if (++done % 20 === 0) console.log(`  ... ${done}/${arts.length}`);
  }

  const [{ n }] = await prisma.$queryRawUnsafe<{ n: bigint }[]>('SELECT count(*)::bigint AS n FROM articolo_embedding');
  console.log(`Fatto. processati=${done} errori=${fail} · righe in articolo_embedding=${n}`);
  await app.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
