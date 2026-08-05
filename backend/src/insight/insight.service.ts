import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrazioneService } from '../integrazione/integrazione.service';
import { EmbeddingService } from '../integrazione/embedding.service';

const PERIODO = 'globale';

@Injectable()
export class InsightService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrazione: IntegrazioneService,
    private readonly embedding: EmbeddingService,
  ) {}

  /** Digest compatto degli eventi del cliente + metriche. */
  private async digest(customerId: number, days = 120) {
    const from = new Date(Date.now() - days * 24 * 3600 * 1000);
    const events = await this.prisma.customerEvent.findMany({
      where: { customerId, createdAt: { gte: from } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const d = (e: (typeof events)[number]) => (e.dettagli ?? {}) as Record<string, unknown>;
    const ricerche = events.filter((e) => e.tipo === 'ricerca').map((e) => String(d(e).q ?? d(e).tipo ?? '')).filter(Boolean);
    const viste = new Map<string, number>();
    for (const e of events.filter((e) => e.tipo === 'articolo.view')) {
      const k = String(d(e).nome ?? e.entitaId ?? '');
      if (k) viste.set(k, (viste.get(k) ?? 0) + 1);
    }
    const carrello = events.filter((e) => e.tipo === 'carrello.add').map((e) => e.entitaId).filter(Boolean) as string[];
    const ordini = events.filter((e) => e.tipo === 'ordine.create').length;
    const topViste = [...viste.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    // Storico ordini reale (gestionale + B2B), non solo eventi del portale.
    const ord = await this.ordiniDigest(customerId, days);

    // Andamento valore (trend YoY) + profilo (settore/interessi) → narrazione dossier-aware.
    const [trendRow] = await this.prisma.$queryRawUnsafe<{ f12: string; fprec: string }[]>(
      `WITH ord AS (
         SELECT o.data_ordine, coalesce(nullif(o.importo_totale, 0),
                (SELECT sum(ro.prezzo * ro.quantita) FROM righe_ordini ro WHERE ro.ordine_id = o.id)) AS imp
           FROM ordini_clienti o WHERE o.customer_id = $1)
       SELECT coalesce(sum(imp) FILTER (WHERE data_ordine >= now() - interval '12 months'), 0)::numeric AS f12,
              coalesce(sum(imp) FILTER (WHERE data_ordine >= now() - interval '24 months' AND data_ordine < now() - interval '12 months'), 0)::numeric AS fprec
         FROM ord`,
      customerId,
    );
    const f12 = Number(trendRow?.f12 ?? 0), fprec = Number(trendRow?.fprec ?? 0);
    const trend = fprec > 0 ? Math.round(((f12 - fprec) / fprec) * 100) : null;
    const prof = await this.prisma.customerProfile.findUnique({
      where: { customerId }, select: { settore: true, interessiPrincipali: true, nonCompreraMai: true },
    });
    const interessi = Array.isArray(prof?.interessiPrincipali) ? (prof!.interessiPrincipali as string[]) : [];
    const nonVuole = Array.isArray(prof?.nonCompreraMai) ? (prof!.nonCompreraMai as string[]) : [];

    const metriche = {
      eventi: events.length, ricerche: ricerche.length,
      viste: [...viste.values()].reduce((s, n) => s + n, 0),
      articoliDistinti: viste.size, aggiuntiCarrello: carrello.length,
      ordiniPortale: ordini,
      ordiniTotali: ord.nOrdini, ordiniRecenti: ord.nRecenti, importoTotale: ord.importo, ultimoOrdine: ord.ultimo,
    };
    const testo = [
      ord.nOrdini
        ? `Storico ordini: ${ord.nOrdini} ordini (${ord.nRecenti} negli ultimi ${days} giorni), importo totale ${ord.importo.toFixed(2)} €${ord.ultimo ? `, ultimo il ${ord.ultimo.toLocaleDateString('it-IT')}` : ''}.`
        : 'Storico ordini: nessun ordine registrato.',
      trend != null ? `Andamento valore ultimi 12 mesi vs 12 precedenti: ${trend >= 0 ? '+' : ''}${trend}%.` : '',
      prof?.settore ? `Settore: ${prof.settore}.` : '',
      ord.topFamiglie.length ? `Famiglie più acquistate: ${ord.topFamiglie.map((f) => `${f.nome} (${f.n})`).join('; ')}.` : '',
      ord.topProdotti.length ? `Prodotti più acquistati: ${ord.topProdotti.map((f) => `${f.nome} (${f.n})`).join('; ')}.` : '',
      interessi.length ? `Interessi noti (dal profilo): ${interessi.join('; ')}.` : '',
      nonVuole.length ? `Da NON proporre: ${nonVuole.join('; ')}.` : '',
      `Attività portale B2B ultimi ${days} giorni: ${events.length} eventi.`,
      ricerche.length ? `Ricerche: ${[...new Set(ricerche)].slice(0, 12).join('; ')}.` : '',
      topViste.length ? `Articoli più visti: ${topViste.map(([n, c]) => `${n} (${c})`).join('; ')}.` : '',
      carrello.length ? `Aggiunti al carrello: ${[...new Set(carrello)].slice(0, 12).join(', ')}.` : '',
    ].filter(Boolean).join('\n');
    return { testo, metriche, haDati: events.length > 0 || ord.nOrdini > 0 };
  }

  /** Storico ordini reali da ordini_clienti/righe_ordini (import gestionale + checkout B2B). */
  private async ordiniDigest(customerId: number, days: number) {
    const [agg] = await this.prisma.$queryRawUnsafe<{ n: number; recenti: number; importo: string | null; ultimo: Date | null }[]>(
      // importo: header importo_totale se valorizzato, altrimenti somma delle righe (prezzo*quantita).
      `SELECT count(*)::int AS n,
              count(*) FILTER (WHERE o.data_ordine >= now() - make_interval(days => $2::int))::int AS recenti,
              coalesce(sum(coalesce(nullif(o.importo_totale, 0),
                (SELECT sum(ro.prezzo * ro.quantita) FROM righe_ordini ro WHERE ro.ordine_id = o.id))), 0)::numeric AS importo,
              max(o.data_ordine) AS ultimo
         FROM ordini_clienti o WHERE o.customer_id = $1`,
      customerId, days,
    );
    const famiglie = await this.prisma.$queryRawUnsafe<{ nome: string; n: number }[]>(
      `SELECT x.nome, sum(x.n)::int AS n FROM (
         SELECT f.nome AS nome, count(*) AS n
           FROM righe_ordini ro JOIN ordini_clienti o ON o.id = ro.ordine_id
           JOIN varianti v ON v.codice = ro.codice_prodotto
           JOIN articoli a ON a.id = v.articolo_id JOIN famiglie f ON f.codice = a.famiglia_codice
          WHERE o.customer_id = $1 GROUP BY f.nome
         UNION ALL
         SELECT f.nome, count(*) FROM righe_ordini ro JOIN ordini_clienti o ON o.id = ro.ordine_id
           JOIN articoli a ON a.codice_linea = ro.codice_prodotto JOIN famiglie f ON f.codice = a.famiglia_codice
          WHERE o.customer_id = $1 GROUP BY f.nome
       ) x GROUP BY x.nome ORDER BY sum(x.n) DESC LIMIT 8`,
      customerId,
    );
    const prodotti = await this.prisma.$queryRawUnsafe<{ nome: string; n: number }[]>(
      `SELECT coalesce(nullif(ro.descrizione, ''), ro.codice_prodotto) AS nome, count(*)::int AS n
         FROM righe_ordini ro JOIN ordini_clienti o ON o.id = ro.ordine_id
        WHERE o.customer_id = $1 AND coalesce(nullif(ro.descrizione, ''), ro.codice_prodotto) IS NOT NULL
        GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
      customerId,
    );
    return {
      nOrdini: agg?.n ?? 0,
      nRecenti: agg?.recenti ?? 0,
      importo: agg?.importo ? Number(agg.importo) : 0,
      ultimo: agg?.ultimo ?? null,
      topFamiglie: famiglie,
      topProdotti: prodotti,
    };
  }

  /** Genera (o rigenera) la sintesi AI del cliente: profilo + prossima azione. */
  async generate(customerId: number) {
    const { testo: digest, metriche, haDati } = await this.digest(customerId);
    const prompt = `Sei un analista commerciale B2B per un'azienda di vasi e complementi.
Dai dati del cliente qui sotto (storico ordini, andamento, comportamento, profilo), scrivi in italiano, max ~130 parole:
1) un breve PROFILO commerciale: chi è, cosa compra, salute/andamento (crescita, stabilità o abbandono), stagionalità;
2) "Prossima azione consigliata:" per l'agente, CONCRETA: quali prodotti/categorie proporre (riordino, cross-sell, up-sell) rispettando ciò che il cliente NON vuole.
Sii concreto, niente frasi vuote. Se i dati sono pochi, dillo.

Dati cliente:
${digest || '(nessun dato registrato)'}`;

    let sintesi = haDati ? await this.integrazione.generaSintesiAI(prompt) : 'Dati insufficienti: il cliente non ha ordini storici né attività sul portale.';
    sintesi = (sintesi || '').trim();
    const vec = await this.embedding.embedText(sintesi);

    const insight = await this.prisma.customerInsight.upsert({
      where: { customerId_periodo: { customerId, periodo: PERIODO } },
      create: { customerId, periodo: PERIODO, testo: sintesi, metriche: metriche as never, embedding: (vec ?? undefined) as never },
      update: { testo: sintesi, metriche: metriche as never, embedding: (vec ?? undefined) as never, generatoIl: new Date() },
    });
    return { testo: insight.testo, metriche, generatoIl: insight.generatoIl };
  }

  /** Ultima sintesi salvata (senza rigenerare). */
  async latest(customerId: number) {
    const i = await this.prisma.customerInsight.findUnique({ where: { customerId_periodo: { customerId, periodo: PERIODO } } });
    if (!i) return null;
    return { testo: i.testo, metriche: i.metriche, generatoIl: i.generatoIl };
  }

  /** Clienti che si comportano in modo simile (coseno sugli embedding delle sintesi). */
  async simili(customerId: number, k = 5) {
    const rows = await this.prisma.customerInsight.findMany({
      where: { periodo: PERIODO },
      select: { customerId: true, embedding: true },
    });
    const target = rows.find((r) => r.customerId === customerId)?.embedding as number[] | null | undefined;
    if (!target?.length) return [];
    const scored = rows
      .filter((r) => r.customerId !== customerId && Array.isArray(r.embedding) && (r.embedding as number[]).length)
      .map((r) => ({ customerId: r.customerId, score: EmbeddingService.cosine(target, r.embedding as number[]) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
    if (!scored.length) return [];
    const clienti = await this.prisma.customer.findMany({ where: { id: { in: scored.map((s) => s.customerId) } }, select: { id: true, nome: true, ragioneSociale: true } });
    return scored.map((s) => ({ ...s, nome: clienti.find((c) => c.id === s.customerId)?.ragioneSociale || clienti.find((c) => c.id === s.customerId)?.nome || `#${s.customerId}` }));
  }
}
