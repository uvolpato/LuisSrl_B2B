/** Verifica del riaggancio ordine B2B <-> documento Integra via mvt_vsrif.
 *  Crea dati finti, esegue la sync, controlla, e ripulisce tutto. */
import 'dotenv/config';
import { PrismaService } from '../src/prisma/prisma.service';
import { IntegrazioneService } from '../src/integrazione/integrazione.service';

const RIF = 'B2B-TEST-VSRIF';
const ID_ORDINE_FINTO = 999000111;

(async () => {
  const p = new PrismaService();
  await p.$connect();

  // Colonne aggiunte da syncOrdini (che qui non gira: FDW non raggiungibile).
  await p.$executeRawUnsafe(`ALTER TABLE integra_ordini ADD COLUMN IF NOT EXISTS riferimento_b2b TEXT`);
  for (const c of ['prezzo_listino', 'sconto_1', 'sconto_2', 'sconto_3', 'sconto_4']) {
    await p.$executeRawUnsafe(`ALTER TABLE integra_righe_ordini ADD COLUMN IF NOT EXISTS ${c} DECIMAL`);
  }

  // Cliente di prova: uno che non abbia gia' ordini nella copia locale di Integra.
  const cand = await p.$queryRawUnsafe<{ codice_cliente: string }[]>(`
    SELECT c.codice_cliente FROM customers c
    WHERE c.codice_cliente IS NOT NULL AND c.codice_cliente <> ''
      AND NOT EXISTS (SELECT 1 FROM integra_ordini o WHERE o.codice_cliente = c.codice_cliente)
    LIMIT 1`);
  if (!cand.length) { console.log('Nessun cliente adatto'); process.exit(1); }
  const codice = cand[0].codice_cliente;
  const customer = await p.customer.findUnique({ where: { codiceCliente: codice } });
  console.log(`Cliente di prova: ${codice} (id ${customer!.id})`);

  const ordiniPrima = await p.ordineCliente.count({ where: { customerId: customer!.id } });

  // 1. Ordine B2B "gia' esportato"
  const ordine = await p.ordineCliente.create({
    data: {
      numeroOrdine: RIF, dataOrdine: new Date(), customerId: customer!.id,
      importoTotale: 100, stato: 'ESPORTATO', esportatoIl: new Date(), esportatoFile: `${RIF}.xlsx`,
      righe: { create: [{ codiceProdotto: 'ART1', descrizione: 'Articolo 1', quantita: 2, prezzo: 50, prezzoListino: 100, scontoPct: 50, prezzoNetto: 50 }] },
    },
    include: { righe: true },
  });
  console.log(`Ordine B2B creato: #${ordine.id}, ${ordine.righe.length} riga`);

  // 2. Il documento che Integra restituisce (con vsrif valorizzato)
  await p.$executeRawUnsafe(
    `INSERT INTO integra_ordini (id_ordine, numero_ordine, anno_ordine, data_ordine, id_cliente, codice_cliente, importo_imponibile, flag_obsoleto, data_modifica, riferimento_b2b)
     VALUES ($1, 'OC/2026/4321', 2026, now()::date, 1, $2, 250, 0, now(), $3)`,
    ID_ORDINE_FINTO, codice, RIF);
  await p.$executeRawUnsafe(
    `INSERT INTO integra_righe_ordini (id_ordine, id_riga, codice_prodotto, descrizione_riga, quantita, prezzo_netto, prezzo_listino)
     VALUES ($1, 1, 'ART1', 'Articolo 1', 3, 50, 100), ($1, 2, 'ART2', 'Aggiunto da Integra', 2, 50, 80)`,
    ID_ORDINE_FINTO);
  console.log('Documento Integra simulato: 2 righe (qta ART1 modificata 2 -> 3, ART2 aggiunto)');

  // 3. Sync
  // syncOrdiniCliente usa solo prisma: le altre dipendenze non servono in questo percorso.
  const stub = null as never;
  const svc = new IntegrazioneService(p, stub, stub, stub);
  await svc.syncOrdiniCliente(codice);

  // 4. Controlli
  const ordiniDopo = await p.ordineCliente.count({ where: { customerId: customer!.id } });
  const o = await p.ordineCliente.findFirst({
    where: { numeroOrdine: RIF },
    include: { righe: { orderBy: { numeroRiga: 'asc' } } },
  });
  const ok = (msg: string, cond: boolean) => console.log(`${cond ? 'OK  ' : 'KO  '} ${msg}`);
  // atteso: nessun ordine NUOVO oltre a quello di test creato al punto 1
  ok(`nessun duplicato creato (${ordiniPrima} -> ${ordiniDopo}, atteso ${ordiniPrima + 1})`, ordiniDopo === ordiniPrima + 1);
  if (o) {
    ok(`numero_integra valorizzato: ${o.numeroIntegra}`, o.numeroIntegra === 'OC/2026/4321');
    ok(`numero ordine B2B conservato: ${o.numeroOrdine}`, o.numeroOrdine === RIF);
    ok(`stato aggiornato: ${o.stato}`, o.stato === 'Ricevuto');
    ok(`righe riallineate da Integra: ${o.righe.length}`, o.righe.length === 2);
    ok(`quantita' aggiornata su ART1: ${o.righe[0]?.quantita}`, Number(o.righe[0]?.quantita) === 3);
    ok(`sconto ricalcolato su ART2: ${o.righe[1]?.scontoPct}%`, Number(o.righe[1]?.scontoPct) === 37.5);
  }

  // 5. Pulizia
  await p.ordineCliente.deleteMany({ where: { numeroOrdine: RIF } });
  await p.$executeRawUnsafe(`DELETE FROM integra_righe_ordini WHERE id_ordine = $1`, ID_ORDINE_FINTO);
  await p.$executeRawUnsafe(`DELETE FROM integra_ordini WHERE id_ordine = $1`, ID_ORDINE_FINTO);
  const resti = await p.ordineCliente.count({ where: { numeroOrdine: RIF } });
  console.log(`Pulizia: ordini di test rimasti = ${resti}`);

  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
