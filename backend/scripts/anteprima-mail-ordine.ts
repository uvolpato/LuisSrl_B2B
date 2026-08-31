/**
 * Anteprima della mail di conferma ordine: rende l'HTML su file, NON invia nulla.
 *
 *   npx ts-node --transpile-only scripts/anteprima-mail-ordine.ts [numeroOrdine]
 *
 * Senza argomenti usa l'ultimo ordine B2B presente. Il file finisce in
 * backend/anteprima-ordine.html: aprirlo nel browser per controllare logo,
 * immagini prodotto e impaginazione.
 */
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/prisma/prisma.service';
import { MailService, type DatiConfermaOrdine } from '../src/mail/mail.service';

(async () => {
  const p = new PrismaService();
  await p.$connect();

  const numero = process.argv[2];
  const ordine = await p.ordineCliente.findFirst({
    where: numero ? { numeroOrdine: numero } : { numeroOrdine: { startsWith: 'B2B-' } },
    orderBy: { id: 'desc' },
    include: { righe: { orderBy: { id: 'asc' } }, customer: true },
  });
  if (!ordine) { console.log('Nessun ordine trovato'); process.exit(1); }

  const codici = ordine.righe.map((r) => r.codiceProdotto).filter((c): c is string => !!c);
  const varianti = await p.variante.findMany({
    where: { codice: { in: codici } },
    select: { codice: true, articolo: { select: { immagini: { select: { url: true }, orderBy: { id: 'asc' } } } } },
  });
  const immagini = new Map(varianti.map((v) => {
    const urls = v.articolo?.immagini.map((i) => i.url) ?? [];
    return [v.codice, urls.find((u) => !/\.webp$/i.test(u)) ?? urls[0] ?? null];
  }));

  const c = ordine.customer;
  const d = ordine.dataOrdine ?? new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dati: DatiConfermaOrdine = {
    ragioneSociale: c.ragioneSociale || c.nome || '',
    numeroOrdine: ordine.numeroOrdine,
    dataOrdine: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
    totale: Number(ordine.importoTotale ?? 0),
    indirizzo: [c.ragioneSociale ?? c.nome, c.indirizzo, [c.cap, c.citta, c.provincia].filter(Boolean).join(' ')]
      .filter(Boolean).join('\n'),
    note: ordine.notaOrdine,
    righe: ordine.righe.map((r) => ({
      codice: r.codiceProdotto ?? '',
      descrizione: r.descrizione ?? r.codiceProdotto ?? '',
      quantita: Number(r.quantita ?? 0),
      prezzo: Number(r.prezzo ?? 0),
      immagineUrl: immagini.get(r.codiceProdotto ?? '') ?? null,
    })),
  };

  const mail = new MailService(new ConfigService());
  const html = mail.renderConfermaOrdine(dati);
  writeFileSync('anteprima-ordine.html', html, 'utf-8');

  console.log(`Ordine ${ordine.numeroOrdine} — ${dati.righe.length} righe, totale ${dati.totale}`);
  console.log(`Righe con immagine: ${dati.righe.filter((r) => r.immagineUrl).length}/${dati.righe.length}`);
  console.log('Scritto: backend/anteprima-ordine.html (nessuna email inviata)');

  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
