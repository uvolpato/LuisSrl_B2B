import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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
        GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
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
      kpi, stagionalita,
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
