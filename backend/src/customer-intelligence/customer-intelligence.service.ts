import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrazioneService } from '../integrazione/integrazione.service';

export type MotivoOfferta = 'riordino' | 'cross-sell' | 'up-sell';

export interface Offerta {
  id: string;            // codice linea
  nome: string;
  img: string | null;
  prezzo: number | null;
  varianteCodice: string | null; // per "Crea offerta"
  motivo: MotivoOfferta;
  dettaglio: string;     // spiegazione breve
  score: number;
}

export interface DossierKpi {
  fatturato12m: number;
  fatturatoPrec12m: number;
  trendYoY: number | null; // frazione (0.12 = +12%), null se nessuno storico precedente
  fatturatoTotale: number;
  ticketMedio: number | null;
  ordiniTotali: number;
  ordini12m: number;
  ordiniPerAnno: number | null;
  giorniDaUltimoOrdine: number | null;
  cadenzaMediaGiorni: number | null;
  primoOrdine: string | null;
  ultimoOrdine: string | null;
}

export interface DossierFamiglia { codice: string; nome: string; valore: number; pezzi: number; quota: number }

export interface Dossier {
  kpi: DossierKpi;
  stagionalita: number[]; // 12 valori (gen..dic), fatturato per mese calendario
  fatturatoMensile: { mese: string; valore: number }[]; // ultimi 12 mesi rolling (mese = YYYY-MM)
  basket: {
    famiglie: DossierFamiglia[];
    topProdotti: { nome: string; pezzi: number }[];
    nFamiglie: number;
    nArticoli: number;
    concentrazioneHHI: number; // 0..1 (1 = tutto su una famiglia)
  };
  segmento: string;
  salute: 'buona' | 'media' | 'a_rischio';
}

@Injectable()
export class CustomerIntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrazione: IntegrazioneService,
  ) {}

  /**
   * Offerte consigliate per il cliente (deterministico). Ogni candidato ha motivo + score.
   *  - riordino: articoli comprati >=3 volte con cadenza regolare e ormai "in scadenza".
   *  - cross-sell: best-seller nelle famiglie che il cliente compra ma su articoli mai presi.
   * Filtri: esclude nonCompreraMai (dal profilo), solo configurati/attivi con giacenza.
   */
  async raccomandazioni(customerId: number, codiceListino?: string | null): Promise<Offerta[]> {
    const RIORDINO_MIN = 3;        // ponytail: n. minimo di ordini per considerarlo ricorrente
    const RIORDINO_SOGLIA = 0.8;   //           quota di cadenza oltre cui è "da riordinare"
    if (!codiceListino) {
      const cust = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { codiceListino: true } });
      codiceListino = cust?.codiceListino ?? null;
    }

    // 1) Riordino ciclico — articoli ricorrenti mappati al catalogo.
    const riordinoRows = await this.prisma.$queryRawUnsafe<{ id: number; codice_linea: string; n: number; ultimo: Date; primo: Date }[]>(
      `SELECT a.id, a.codice_linea, count(DISTINCT o.id)::int AS n, max(o.data_ordine) AS ultimo, min(o.data_ordine) AS primo
         FROM righe_ordini ro JOIN ordini_clienti o ON o.id = ro.ordine_id
         JOIN articoli a ON (a.codice_linea = ro.codice_prodotto
                             OR EXISTS (SELECT 1 FROM varianti v WHERE v.codice = ro.codice_prodotto AND v.articolo_id = a.id))
        WHERE o.customer_id = $1 AND a.configurato = true AND a.stato = 'ATTIVO'
        GROUP BY a.id, a.codice_linea
       HAVING count(DISTINCT o.id) >= ${RIORDINO_MIN}`,
      customerId,
    );
    const giorno = 86_400_000;
    const riordino = riordinoRows
      .map((r) => {
        const cadenza = Math.max(1, (r.ultimo.getTime() - r.primo.getTime()) / giorno / Math.max(1, r.n - 1));
        const daUltimo = (Date.now() - r.ultimo.getTime()) / giorno;
        const overdue = daUltimo / cadenza;
        return { id: r.id, overdue, n: r.n, giorni: Math.round(daUltimo), cadenza: Math.round(cadenza) };
      })
      .filter((r) => r.overdue >= RIORDINO_SOGLIA)
      .sort((a, b) => b.overdue * Math.log(1 + b.n) - a.overdue * Math.log(1 + a.n))
      .slice(0, 8);

    // 2) Cross-sell — best-seller nelle sue famiglie, su articoli mai acquistati.
    const crossRows = await this.prisma.$queryRawUnsafe<{ id: number; venduto: number }[]>(
      `WITH sue_fam AS (
         SELECT DISTINCT a.famiglia_codice FROM righe_ordini ro JOIN ordini_clienti o ON o.id = ro.ordine_id
           JOIN articoli a ON (a.codice_linea = ro.codice_prodotto
                               OR EXISTS (SELECT 1 FROM varianti v WHERE v.codice = ro.codice_prodotto AND v.articolo_id = a.id))
          WHERE o.customer_id = $1),
       suoi AS (
         SELECT DISTINCT a.id FROM righe_ordini ro JOIN ordini_clienti o ON o.id = ro.ordine_id
           JOIN articoli a ON (a.codice_linea = ro.codice_prodotto
                               OR EXISTS (SELECT 1 FROM varianti v WHERE v.codice = ro.codice_prodotto AND v.articolo_id = a.id))
          WHERE o.customer_id = $1)
       SELECT a.id, count(*)::int AS venduto
         FROM righe_ordini ro JOIN varianti v ON v.codice = ro.codice_prodotto JOIN articoli a ON a.id = v.articolo_id
         JOIN famiglie f ON f.codice = a.famiglia_codice
        WHERE a.famiglia_codice IN (SELECT famiglia_codice FROM sue_fam)
          AND a.id NOT IN (SELECT id FROM suoi)
          AND a.configurato = true AND a.stato = 'ATTIVO' AND f.stato = 'ATTIVO'
          AND EXISTS (SELECT 1 FROM varianti vv WHERE vv.articolo_id = a.id AND vv.stato <> 'NASCOSTO' AND vv.giacenza > 0)
        GROUP BY a.id ORDER BY venduto DESC LIMIT 8`,
      customerId,
    );

    const ids = [...new Set([...riordino.map((r) => r.id), ...crossRows.map((c) => c.id)])];
    if (!ids.length) return [];

    // Arricchimento (prezzo/immagine) + variante rappresentativa (per "Crea offerta").
    const [cards, varRows, profilo] = await Promise.all([
      this.integrazione.arricchisciBoxArticoli(ids, codiceListino ?? null) as Promise<{ id: string; nome: string; img: string | null; prezzo: number | null; famiglia?: { nome?: string } }[]>,
      this.prisma.$queryRawUnsafe<{ articolo_id: number; codice: string }[]>(
        `SELECT DISTINCT ON (v.articolo_id) v.articolo_id, v.codice
           FROM varianti v WHERE v.articolo_id = ANY($1::int[]) AND v.stato <> 'NASCOSTO' AND v.giacenza > 0
          ORDER BY v.articolo_id, v.giacenza DESC`,
        ids,
      ),
      this.prisma.customerProfile.findUnique({ where: { customerId }, select: { nonCompreraMai: true } }),
    ]);
    const varByArt = new Map(varRows.map((v) => [v.articolo_id, v.codice]));
    const cardById = new Map(cards.map((c) => [c.id, c]));
    // Map codiceLinea → articoloId per collegare i risultati.
    const artIdByLinea = new Map<string, number>();
    const lineaRows = await this.prisma.$queryRawUnsafe<{ id: number; codice_linea: string }[]>(
      `SELECT id, codice_linea FROM articoli WHERE id = ANY($1::int[])`, ids,
    );
    for (const r of lineaRows) artIdByLinea.set(r.codice_linea, r.id);

    const escludi = (Array.isArray(profilo?.nonCompreraMai) ? (profilo!.nonCompreraMai as string[]) : []).map((s) => s.toLowerCase());
    const vietato = (nome: string, fam?: string) => {
      const hay = `${nome} ${fam ?? ''}`.toLowerCase();
      return escludi.some((t) => t && hay.includes(t));
    };

    const out: Offerta[] = [];
    for (const r of riordino) {
      const c = cards.find((x) => artIdByLinea.get(x.id) === r.id);
      if (!c || vietato(c.nome, c.famiglia?.nome)) continue;
      out.push({ id: c.id, nome: c.nome, img: c.img, prezzo: c.prezzo, varianteCodice: varByArt.get(r.id) ?? null,
        motivo: 'riordino', dettaglio: `${r.n} riacquisti · ultimo ${r.giorni}gg fa (cadenza ~${r.cadenza}gg)`, score: Number((r.overdue * Math.log(1 + r.n)).toFixed(2)) });
    }
    for (const cr of crossRows) {
      const c = cards.find((x) => artIdByLinea.get(x.id) === cr.id);
      if (!c || vietato(c.nome, c.famiglia?.nome) || out.some((o) => o.id === c.id)) continue;
      out.push({ id: c.id, nome: c.nome, img: c.img, prezzo: c.prezzo, varianteCodice: varByArt.get(cr.id) ?? null,
        motivo: 'cross-sell', dettaglio: `Popolare nella sua categoria, mai acquistato`, score: Number((cr.venduto / 100).toFixed(2)) });
    }
    void cardById;
    return out.slice(0, 12);
  }

  async dossier(customerId: number): Promise<Dossier> {
    const [kpiRow] = await this.prisma.$queryRawUnsafe<{
      ordini_totali: number; ordini_12m: number;
      fatt_12m: string; fatt_prec_12m: string; fatt_totale: string;
      ultimo: Date | null; primo: Date | null;
    }[]>(
      `WITH ord AS (
         SELECT o.data_ordine,
                coalesce(nullif(o.importo_totale, 0),
                         (SELECT sum(ro.prezzo * ro.quantita) FROM righe_ordini ro WHERE ro.ordine_id = o.id)) AS imp
           FROM ordini_clienti o WHERE o.customer_id = $1
       )
       SELECT
         count(*)::int AS ordini_totali,
         count(*) FILTER (WHERE data_ordine >= now() - interval '12 months')::int AS ordini_12m,
         coalesce(sum(imp) FILTER (WHERE data_ordine >= now() - interval '12 months'), 0)::numeric AS fatt_12m,
         coalesce(sum(imp) FILTER (WHERE data_ordine >= now() - interval '24 months' AND data_ordine < now() - interval '12 months'), 0)::numeric AS fatt_prec_12m,
         coalesce(sum(imp), 0)::numeric AS fatt_totale,
         max(data_ordine) AS ultimo, min(data_ordine) AS primo
       FROM ord`,
      customerId,
    );

    const stagRows = await this.prisma.$queryRawUnsafe<{ mese: number; f: string }[]>(
      `SELECT extract(month from o.data_ordine)::int AS mese,
              coalesce(sum(coalesce(nullif(o.importo_totale, 0),
                (SELECT sum(ro.prezzo * ro.quantita) FROM righe_ordini ro WHERE ro.ordine_id = o.id))), 0)::numeric AS f
         FROM ordini_clienti o
        WHERE o.customer_id = $1 AND o.data_ordine IS NOT NULL
        GROUP BY 1`,
      customerId,
    );
    const stagionalita = Array(12).fill(0) as number[];
    for (const r of stagRows) if (r.mese >= 1 && r.mese <= 12) stagionalita[r.mese - 1] = Number(r.f);

    // Fatturato mensile — ultimi 12 mesi rolling (per bar chart "€k").
    const mesiRolling = await this.prisma.$queryRawUnsafe<{ mese: string; valore: string }[]>(
      `SELECT to_char(date_trunc('month', o.data_ordine), 'YYYY-MM') AS mese,
              coalesce(sum(coalesce(nullif(o.importo_totale, 0),
                (SELECT sum(ro.prezzo * ro.quantita) FROM righe_ordini ro WHERE ro.ordine_id = o.id))), 0)::numeric AS valore
         FROM ordini_clienti o
        WHERE o.customer_id = $1 AND o.data_ordine >= date_trunc('month', now()) - interval '11 months'
        GROUP BY 1`,
      customerId,
    );
    const meseValore = new Map(mesiRolling.map((r) => [r.mese, Number(r.valore)]));
    const fatturatoMensile: { mese: string; valore: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      fatturatoMensile.push({ mese: key, valore: meseValore.get(key) ?? 0 });
    }

    const famRows = await this.prisma.$queryRawUnsafe<{ codice: string; nome: string; valore: string; pezzi: string }[]>(
      `SELECT x.codice, x.nome, sum(x.valore)::numeric AS valore, sum(x.pezzi)::numeric AS pezzi FROM (
         SELECT f.codice, f.nome, sum(ro.prezzo * ro.quantita) AS valore, sum(ro.quantita) AS pezzi
           FROM righe_ordini ro JOIN ordini_clienti o ON o.id = ro.ordine_id
           JOIN varianti v ON v.codice = ro.codice_prodotto
           JOIN articoli a ON a.id = v.articolo_id JOIN famiglie f ON f.codice = a.famiglia_codice
          WHERE o.customer_id = $1 GROUP BY f.codice, f.nome
         UNION ALL
         SELECT f.codice, f.nome, sum(ro.prezzo * ro.quantita), sum(ro.quantita)
           FROM righe_ordini ro JOIN ordini_clienti o ON o.id = ro.ordine_id
           JOIN articoli a ON a.codice_linea = ro.codice_prodotto JOIN famiglie f ON f.codice = a.famiglia_codice
          WHERE o.customer_id = $1 GROUP BY f.codice, f.nome
       ) x GROUP BY x.codice, x.nome ORDER BY valore DESC`,
      customerId,
    );
    const [prodRow] = await this.prisma.$queryRawUnsafe<{ n_articoli: number }[]>(
      `SELECT count(DISTINCT coalesce(nullif(ro.descrizione, ''), ro.codice_prodotto))::int AS n_articoli
         FROM righe_ordini ro JOIN ordini_clienti o ON o.id = ro.ordine_id WHERE o.customer_id = $1`,
      customerId,
    );
    const topProd = await this.prisma.$queryRawUnsafe<{ nome: string; pezzi: string }[]>(
      `SELECT coalesce(nullif(ro.descrizione, ''), ro.codice_prodotto) AS nome, sum(ro.quantita)::numeric AS pezzi
         FROM righe_ordini ro JOIN ordini_clienti o ON o.id = ro.ordine_id
        WHERE o.customer_id = $1 AND coalesce(nullif(ro.descrizione, ''), ro.codice_prodotto) IS NOT NULL
        GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
      customerId,
    );

    // ── Derivazioni ────────────────────────────────────────────────
    const fatt12m = Number(kpiRow?.fatt_12m ?? 0);
    const fattPrec = Number(kpiRow?.fatt_prec_12m ?? 0);
    const ordiniTotali = kpiRow?.ordini_totali ?? 0;
    const ordini12m = kpiRow?.ordini_12m ?? 0;
    const ultimo = kpiRow?.ultimo ?? null;
    const primo = kpiRow?.primo ?? null;
    const giorno = 86_400_000;
    const giorniDaUltimo = ultimo ? Math.floor((Date.now() - ultimo.getTime()) / giorno) : null;
    const spanGiorni = primo && ultimo ? Math.max(1, (ultimo.getTime() - primo.getTime()) / giorno) : null;
    const cadenza = spanGiorni && ordiniTotali > 1 ? Math.round(spanGiorni / (ordiniTotali - 1)) : null;
    const ordiniPerAnno = spanGiorni ? Number((ordiniTotali / (spanGiorni / 365)).toFixed(1)) : null;

    const totFam = famRows.reduce((s, f) => s + Number(f.valore), 0);
    const famiglie: DossierFamiglia[] = famRows.map((f) => ({
      codice: f.codice, nome: f.nome, valore: Number(f.valore), pezzi: Number(f.pezzi),
      quota: totFam > 0 ? Number(f.valore) / totFam : 0,
    }));
    const hhi = famiglie.reduce((s, f) => s + f.quota * f.quota, 0);

    const kpi: DossierKpi = {
      fatturato12m: fatt12m, fatturatoPrec12m: fattPrec,
      trendYoY: fattPrec > 0 ? (fatt12m - fattPrec) / fattPrec : null,
      fatturatoTotale: Number(kpiRow?.fatt_totale ?? 0),
      ticketMedio: ordini12m > 0 ? fatt12m / ordini12m : null,
      ordiniTotali, ordini12m, ordiniPerAnno,
      giorniDaUltimoOrdine: giorniDaUltimo, cadenzaMediaGiorni: cadenza,
      primoOrdine: primo ? primo.toISOString() : null,
      ultimoOrdine: ultimo ? ultimo.toISOString() : null,
    };

    const { segmento, salute } = this.classifica(kpi);

    return {
      kpi, stagionalita, fatturatoMensile,
      basket: {
        famiglie: famiglie.slice(0, 8),
        topProdotti: topProd.map((p) => ({ nome: p.nome, pezzi: Number(p.pezzi) })),
        nFamiglie: famiglie.length,
        nArticoli: prodRow?.n_articoli ?? 0,
        concentrazioneHHI: Number(hhi.toFixed(2)),
      },
      segmento, salute,
    };
  }

  /** Segmentazione deterministica (RFM + trend). Soglie riviste con dati reali. */
  private classifica(k: DossierKpi): { segmento: string; salute: Dossier['salute'] } {
    const rec = k.giorniDaUltimoOrdine;
    const cad = k.cadenzaMediaGiorni ?? 45;
    const trend = k.trendYoY;

    if (k.ordiniTotali <= 2) return { segmento: 'Nuovo', salute: 'media' };
    if (rec != null && rec > Math.max(180, cad * 4)) return { segmento: 'Dormiente', salute: 'a_rischio' };
    if ((rec != null && rec > cad * 2) || (trend != null && trend < -0.2)) return { segmento: 'A rischio', salute: 'a_rischio' };
    if (trend != null && trend > 0.1) return { segmento: 'Fedele in crescita', salute: 'buona' };
    if (k.ordini12m >= 8 && (trend == null || trend >= 0)) return { segmento: 'Champion', salute: 'buona' };
    return { segmento: 'Fedele stabile', salute: 'buona' };
  }
}
