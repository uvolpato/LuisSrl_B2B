import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrazioneService } from '../integrazione/integrazione.service';
import { DatiImpresaService, type DatiImpresa } from '../dati-impresa/dati-impresa.service';

interface CustomerProfileData {
  datiImpresa: DatiImpresa | null;
  ragioneSociale: string | null;
  partitaIva: string | null;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  sediSpedizione: string;
  contatti: Array<{ tipo: string; contenuto: string }>;
  totaleOrdini: number;
  ordiniUltimi12Mesi: number;
  famiglieAcquistate: Array<{ codice: string; nome: string; n: number }>;
  importoTotale: number;
  ticketMedio: number | null;
  topProdotti: Array<{ nome: string; n: number }>;
  tracking: { visti: number; salvati: number };
  progetti: Array<{ nome: string; n: number }>;
}

export interface CustomerProfileResult {
  id?: number;
  customerId?: number;
  generatoIl?: Date;
  aggiornatoIl?: Date;
  settore: string | null;
  dimensione: string | null;
  fatturatoStimato: string | null;
  composizioneBusiness: string | null;
  sedi: string[];
  contattiChiave: Array<{ nome: string; ruolo: string }>;
  interessiPrincipali: string[];
  interessiSecondari: string[];
  nonCompreraMai: string[];
  stagionalita: string | null;
  opportunitaCrossSell: string[];
  sintesiBreve: string | null;
  sintesi: string | null;
}

@Injectable()
export class CustomerProfileService {
  private readonly log = new Logger(CustomerProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrazione: IntegrazioneService,
    private readonly datiImpresa: DatiImpresaService,
  ) {}

  async getProfilo(customerId: number): Promise<CustomerProfileResult | null> {
    const row = await this.prisma.customerProfile.findUnique({ where: { customerId } });
    if (!row) return null;
    return {
      id: row.id,
      customerId: row.customerId,
      generatoIl: row.generatoIl,
      aggiornatoIl: row.aggiornatoIl,
      settore: row.settore,
      dimensione: row.segmento,
      fatturatoStimato: row.fatturatoStimato?.toString() ?? null,
      composizioneBusiness: row.composizione,
      sedi: row.sedi ? row.sedi.split('; ').filter(Boolean) : [],
      contattiChiave: Array.isArray(row.contatti) ? (row.contatti as { nome: string; ruolo: string }[]) : [],
      interessiPrincipali: Array.isArray(row.interessiPrincipali) ? (row.interessiPrincipali as string[]) : [],
      interessiSecondari: Array.isArray(row.interessiSecondari) ? (row.interessiSecondari as string[]) : [],
      nonCompreraMai: Array.isArray(row.nonCompreraMai) ? (row.nonCompreraMai as string[]) : [],
      stagionalita: row.stagionalita,
      opportunitaCrossSell: Array.isArray(row.opportunitaCrossSell) ? (row.opportunitaCrossSell as string[]) : [],
      sintesiBreve: row.sintesi,
      sintesi: row.sintesi,
    };
  }

  async generaProfilo(customerId: number): Promise<CustomerProfileResult | null> {
    const data = await this.raccogliDati(customerId);
    if (!data) return null;

    const prompt = this.buildPrompt(data);
    const raw = await this.integrazione.generaSintesiAIConRicerca(prompt);
    if (!raw) return null;

    const json = this.estraiJson(raw);
    if (!json) {
      this.log.warn(`Profilo cliente #${customerId}: LLM non ha restituito JSON valido`);
      return null;
    }

    const result: CustomerProfileResult = {
      settore: data.datiImpresa?.settore ?? json.settore ?? null,
      dimensione: json.dimensione ?? null,
      fatturatoStimato: data.datiImpresa?.fatturato != null
        ? `€${data.datiImpresa.fatturato.toLocaleString('it-IT')} (registro imprese)`
        : json.fatturatoStimato ?? null,
      composizioneBusiness: json.composizioneBusiness ?? null,
      sedi: Array.isArray(json.sedi) ? json.sedi : [],
      contattiChiave: Array.isArray(json.contattiChiave) ? json.contattiChiave : [],
      interessiPrincipali: Array.isArray(json.interessiPrincipali) ? json.interessiPrincipali : [],
      interessiSecondari: Array.isArray(json.interessiSecondari) ? json.interessiSecondari : [],
      nonCompreraMai: Array.isArray(json.nonCompreraMai) ? json.nonCompreraMai : [],
      stagionalita: json.stagionalita ?? null,
      opportunitaCrossSell: Array.isArray(json.opportunitaCrossSell) ? json.opportunitaCrossSell : [],
      sintesiBreve: json.sintesiBreve ?? null,
      sintesi: json.sintesi ?? null,
    };

    await this.prisma.customerProfile.upsert({
      where: { customerId },
      create: {
        customerId,
        settore: result.settore,
        fatturatoStimato: result.fatturatoStimato,
        composizione: result.composizioneBusiness,
        sedi: result.sedi.join('; '),
        contatti: result.contattiChiave,
        segmento: result.dimensione,
        sintesi: result.sintesiBreve,
        interessiPrincipali: result.interessiPrincipali,
        interessiSecondari: result.interessiSecondari,
        nonCompreraMai: result.nonCompreraMai,
        opportunitaCrossSell: result.opportunitaCrossSell,
        stagionalita: result.stagionalita,
        fonti: { segnaliUsati: ['ordini', 'tracking', 'progetti', 'indirizzi', 'contatti'], versionePubblica: '2026-08' },
      },
      update: {
        settore: result.settore,
        fatturatoStimato: result.fatturatoStimato,
        composizione: result.composizioneBusiness,
        sedi: result.sedi.join('; '),
        contatti: result.contattiChiave,
        segmento: result.dimensione,
        sintesi: result.sintesiBreve,
        interessiPrincipali: result.interessiPrincipali,
        interessiSecondari: result.interessiSecondari,
        nonCompreraMai: result.nonCompreraMai,
        opportunitaCrossSell: result.opportunitaCrossSell,
        stagionalita: result.stagionalita,
        fonti: { segnaliUsati: ['ordini', 'tracking', 'progetti', 'indirizzi', 'contatti'], versionePubblica: '2026-08' },
        aggiornatoIl: new Date(),
      },
    });

    this.log.log(`Profilo generato per cliente #${customerId}: ${result.sintesiBreve?.slice(0, 80) ?? '—'}`);
    return result;
  }

  @Cron('0 4 * * 0')
  async generaTuttiSettimanale() {
    this.log.log('Batch customer profiles: inizio generazione');
    const result = await this.generaTutti();
    this.log.log(`Batch customer profiles: ${result.ok} ok, ${result.errori} errori su ${result.totali} clienti`);
  }

  async generaTutti(): Promise<{ totali: number; ok: number; errori: number }> {
    const customers = await this.prisma.customer.findMany({
      where: { stato: 'ATTIVO' },
      select: { id: true },
    });
    let ok = 0;
    let errori = 0;
    for (const c of customers) {
      try {
        const profile = await this.prisma.customerProfile.findUnique({ where: { customerId: c.id } });
        if (profile && profile.aggiornatoIl > new Date(Date.now() - 7 * 86400000)) {
          continue;
        }
        await this.generaProfilo(c.id);
        ok++;
      } catch (e) {
        errori++;
        this.log.warn(`Profilo cliente #${c.id} fallito: ${(e as Error).message}`);
      }
    }
    return { totali: customers.length, ok, errori };
  }

  private async raccogliDati(customerId: number): Promise<CustomerProfileData | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        ragioneSociale: true,
        partitaIva: true,
        indirizzo: true,
        cap: true,
        citta: true,
        provincia: true,
      },
    });
    if (!customer) return null;

    const [indirizziSpedizione, contatti, ordini, ordini12Mesi, progetti] = await Promise.all([
      this.prisma.indirizzoCliente.findMany({
        where: { customerId, tipoDestinazione: { in: ['SPEDIZIONE', 'FATTURAZIONE', ''] } },
        select: { indirizzo: true, cap: true, citta: true, provincia: true },
      }),
      this.prisma.contattoCliente.findMany({
        where: { customerId },
        select: { tipo: true, contenuto: true },
      }),
      this.prisma.ordineCliente.findMany({
        where: { customerId },
        select: { id: true },
      }),
      this.prisma.$queryRawUnsafe<{ n: bigint; importoTotale: string | null }[]>(
        // importo: header importo_totale se valorizzato, altrimenti somma righe (prezzo*quantita).
        // L'import gestionale può lasciare importo_totale a 0/NULL, ma le righe hanno i prezzi.
        `SELECT count(*)::bigint AS n, coalesce(sum(imp), 0) AS importoTotale FROM (
           SELECT coalesce(nullif(o.importo_totale, 0),
                           (SELECT sum(ro.prezzo * ro.quantita) FROM righe_ordini ro WHERE ro.ordine_id = o.id)) AS imp
             FROM ordini_clienti o
            WHERE o.customer_id = $1 AND o.data_ordine >= now() - make_interval(months => 12)
         ) t`,
        customerId,
      ),
      this.prisma.progetto.findMany({
        where: { clienteId: customerId },
        select: { nome: true, items: { select: { id: true } } },
      }),
    ]);

    const totaleOrdini = ordini.length;
    const ordiniUltimi12Mesi = ordini12Mesi.length;
    const importoTotale = ordini12Mesi[0]?.importoTotale
      ? parseFloat(ordini12Mesi[0].importoTotale)
      : 0;
    const ticketMedio = totaleOrdini > 0 ? importoTotale / totaleOrdini : null;

    const righe = await this.prisma.$queryRawUnsafe<{
      famiglia_codice: string;
      famiglia_nome: string;
      articolo_nome: string;
      quantita: bigint;
    }[]>(
      `SELECT f.codice AS famiglia_codice, f.nome AS famiglia_nome, a.nome AS articolo_nome, sum(ro.quantita)::bigint AS quantita
         FROM righe_ordini ro JOIN ordini_clienti o ON o.id = ro.ordine_id
         JOIN varianti v ON v.codice = ro.codice_prodotto
         JOIN articoli a ON a.id = v.articolo_id
         JOIN famiglie f ON f.codice = a.famiglia_codice
        WHERE o.customer_id = $1
        GROUP BY f.codice, f.nome, a.nome
        ORDER BY quantita DESC
        LIMIT 10`,
      customerId,
    );

    const famiglieMap = new Map<string, { codice: string; nome: string; n: number }>();
    const topProdotti: Array<{ nome: string; n: number }> = [];
    for (const r of righe) {
      if (!famiglieMap.has(r.famiglia_codice)) {
        famiglieMap.set(r.famiglia_codice, { codice: r.famiglia_codice, nome: r.famiglia_nome, n: 0 });
      }
      famiglieMap.get(r.famiglia_codice)!.n += Number(r.quantita);
      topProdotti.push({ nome: r.articolo_nome, n: Number(r.quantita) });
    }
    const famiglieAcquistate = [...famiglieMap.values()].sort((a, b) => b.n - a.n);

    const tracking = await this.prisma.$queryRawUnsafe<{ tipo: string; n: bigint }[]>(
      `SELECT tipo, count(*)::bigint AS n
         FROM customer_event
        WHERE customer_id = $1
        AND tipo IN ('articolo.view', 'carrello.add', 'carrello.remove', 'carrello.update', 'ricerca')
        GROUP BY tipo`,
      customerId,
    );
    const trackingMap: Record<string, number> = {};
    for (const t of tracking) trackingMap[t.tipo] = Number(t.n);

    const progettiFiltrati = progetti
      .filter((p) => p.items.length > 0)
      .sort((a, b) => b.items.length - a.items.length)
      .slice(0, 5);

    const sediSpedizione = indirizziSpedizione
      .map((i) => `${i.indirizzo ?? ''}, ${i.cap ?? ''} ${i.citta ?? ''} ${i.provincia ?? ''}`)
      .filter(Boolean)
      .join('; ');

    // B) Dati ufficiali per P.IVA (registro imprese), se il provider è configurato.
    const datiImpresa = await this.datiImpresa.lookup(customer.partitaIva);

    return {
      datiImpresa,
      ragioneSociale: customer.ragioneSociale,
      partitaIva: customer.partitaIva,
      indirizzo: customer.indirizzo,
      cap: customer.cap,
      citta: customer.citta,
      provincia: customer.provincia,
      sediSpedizione,
      contatti: contatti.map((c) => ({ tipo: c.tipo, contenuto: c.contenuto })),
      totaleOrdini,
      ordiniUltimi12Mesi,
      famiglieAcquistate,
      importoTotale,
      ticketMedio,
      topProdotti: topProdotti.slice(0, 5),
      tracking: {
        visti: trackingMap['articolo.view'] ?? 0,
        salvati: trackingMap['carrello.add'] ?? 0,
      },
      progetti: progettiFiltrati.map((p) => ({ nome: p.nome, n: p.items.length })),
    };
  }

  private buildPrompt(data: CustomerProfileData): string {
    return [
      'Sei un assistente di intelligence commerciale B2B per un\'azienda di vasi e complementi da giardino.',
      '',
      'Genera un profilo di sintesi del cliente seguente. Usa i DATI UFFICIALI e di vendita qui sotto,',
      'e COMPLETALI cercando sul web informazioni sull\'azienda (ragione sociale + città/P.IVA):',
      'cosa produce/vende, settore, dimensione, stagionalità. Preferisci sempre i dati ufficiali quando presenti.',
      'La descrizione deve essere utile a un commerciale per capire chi è il cliente,',
      'cosa gli interessa e cosa probabilmente NON gli interesserà mai. Se un dato non è verificabile, dillo.',
      '',
      ...(data.datiImpresa ? [
        'DATI UFFICIALI (registro imprese, fonte affidabile — usali come verità):',
        `- Denominazione: ${data.datiImpresa.ragioneSociale ?? '—'}`,
        `- Codice ATECO: ${data.datiImpresa.ateco ?? '—'}`,
        `- Settore: ${data.datiImpresa.settore ?? '—'}`,
        `- Fatturato: ${data.datiImpresa.fatturato != null ? '€' + data.datiImpresa.fatturato.toLocaleString('it-IT') : '—'}`,
        `- Addetti: ${data.datiImpresa.addetti ?? '—'}`,
        '',
      ] : []),
      'DATI ANAGRAFICI DEL CLIENTE (da Integra):',
      `- Ragione sociale: ${data.ragioneSociale ?? '—'}`,
      `- Partita IVA: ${data.partitaIva ?? '—'}`,
      `- Sede legale: ${[data.indirizzo, data.cap, data.citta, data.provincia].filter(Boolean).join(', ') || '—'}`,
      `- Sedi di spedizione: ${data.sediSpedizione || '—'}`,
      `- Contatti: ${data.contatti.map((c) => `${c.tipo}: ${c.contenuto}`).join('; ') || '—'}`,
      '',
      'DATI DI VENDITA (dal portale):',
      `- Ordini totali: ${data.totaleOrdini}`,
      `- Ordini ultimi 12 mesi: ${data.ordiniUltimi12Mesi}`,
      `- Famiglie acquistate: ${data.famiglieAcquistate.map((f) => `${f.nome} (${f.n} pezzi)`).join('; ') || '—'}`,
      `- Importo totale ordini: €${data.importoTotale.toFixed(2)}`,
      `- Ticket medio: ${data.ticketMedio ? '€' + data.ticketMedio.toFixed(2) : '—'}`,
      `- Prodotti più comprati: ${data.topProdotti.map((p) => `${p.nome} (${p.n})`).join('; ') || '—'}`,
      `- Tracking: ${data.tracking.visti} visti, ${data.tracking.salvati} salvati`,
      `- Progetti attivi: ${data.progetti.map((p) => `${p.nome} (${p.n} righe)`).join('; ') || '—'}`,
      '',
      'OUTPUT RICHIESTO (solo JSON, nessun testo aggiuntivo):',
      JSON.stringify({
        settore: 'es. Vivaistica, Garden Center, Floricoltura...',
        dimensione: 'piccolo | medio | grande',
        fatturatoStimato: 'es. 500k-1M€',
        composizioneBusiness: 'cosa produce/vende il cliente, in quale fase della filiera',
        sedi: ['sede1', 'sede2'],
        contattiChiave: [{ nome: '...', ruolo: '...' }],
        interessiPrincipali: ['vasi da esterno', 'illuminazione giardino', '...'],
        interessiSecondari: ['...', '...'],
        nonCompreraMai: ['prodotti che non combaciano con il business'],
        stagionalita: 'quando compra di più',
        opportunitaCrossSell: ['prodotti complementari che potrebbe acquistare'],
        sintesiBreve: '2-3 frasi per un commerciale: chi è, cosa cerca, cosa proporre',
      }, null, 2),
    ].join('\n');
  }

  private estraiJson(raw: string): CustomerProfileResult | null {
    try {
      const trimmed = raw.trim();
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}');
      if (start === -1 || end === -1 || end <= start) return null;
      return JSON.parse(trimmed.slice(start, end + 1)) as CustomerProfileResult;
    } catch {
      return null;
    }
  }
}