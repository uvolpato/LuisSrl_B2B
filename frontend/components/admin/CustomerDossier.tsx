"use client";

import type { CustomerDossier, CustomerInsight } from "../../lib/types";
import { formatPrice } from "../../lib/helpers";
import Hint from "../common/Hint";

const MESI = ["G", "F", "M", "A", "M", "G", "L", "A", "S", "O", "N", "D"];
const SALUTE: Record<CustomerDossier["salute"], { txt: string; col: string }> = {
  buona: { txt: "buona", col: "var(--ok)" },
  media: { txt: "media", col: "var(--amber)" },
  a_rischio: { txt: "a rischio", col: "var(--danger)" },
};

function euroK(v: number): string {
  const k = v / 1000;
  return k >= 10 ? `${Math.round(k)}K` : `${Math.round(k * 10) / 10}K`;
}

function fmtData(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="tile">
      <div className="k">{label}</div>
      <div className="v">{value}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  );
}

function Trend({ v }: { v: number | null }) {
  if (v == null) return <span style={{ color: "var(--muted)" }}>—</span>;
  const up = v >= 0;
  return (
    <span className={up ? "trend-up" : "trend-down"}>
      {up ? "▲" : "▼"} {Math.abs(v * 100).toFixed(0)}% YoY
    </span>
  );
}

export default function CustomerDossier({
  dossier,
  insight,
}: {
  dossier: CustomerDossier | null;
  insight: CustomerInsight | null;
}) {
  if (!dossier) return <p style={{ color: "var(--muted)" }}>Caricamento dossier…</p>;

  const k = dossier.kpi;
  const s = SALUTE[dossier.salute];
  const maxStag = Math.max(1, ...dossier.stagionalita);
  const maxMens = Math.max(1, ...dossier.fatturatoMensile.map((m) => m.valore));
  const famiglie = dossier.basket.famiglie.slice(0, 5);

  const barreMensili = dossier.fatturatoMensile.map((m) => ({
    ...m,
    hi: m.valore >= maxMens,
    lettera: MESI[new Date(m.mese + "-01T00:00:00").getMonth()] ?? "",
  }));

  return (
    <div className="stack">
      <div className="panel-intro">
        <strong>Riepilogo e performance</strong>
        <Hint>
          Sintesi commerciale del cliente: indicatori di fatturato, salute, stagionalità e composizione
          acquisti, calcolati dallo storico ordini. Ogni blocco spiega cosa leggere.
        </Hint>
      </div>

      <div className="ai-box">
        <div className="ai-body">
          {insight ? insight.testo : "Nessuna sintesi disponibile. Usa «Elabora con AI» per generarla."}
        </div>
        {insight && <div className="ai-meta">Generata il {fmtData(insight.generatoIl)}</div>}
      </div>

      <div className="kpis">
        <Tile label="Fatturato 12m" value={formatPrice(k.fatturato12m)} sub={<Trend v={k.trendYoY} />} />
        <Tile label="Fatturato totale" value={formatPrice(k.fatturatoTotale)} sub={<span style={{ color: "var(--muted)" }}>{k.ordiniTotali} ordini</span>} />
        <Tile label="Ticket medio" value={k.ticketMedio != null ? formatPrice(k.ticketMedio) : "—"} />
        <Tile label="Cadenza" value={k.cadenzaMediaGiorni != null ? `~${k.cadenzaMediaGiorni} gg` : "—"} sub={k.ordiniPerAnno != null ? <span style={{ color: "var(--muted)" }}>{k.ordiniPerAnno} ordini/anno</span> : undefined} />
        <Tile label="Assortimento" value={`${dossier.basket.nFamiglie} fam.`} sub={<span style={{ color: "var(--muted)" }}>{dossier.basket.nArticoli} articoli</span>} />
      </div>
      <p className="kpi-caption">
        Valori calcolati sullo storico ordini: trend rispetto all&apos;anno precedente, frequenza media d&apos;acquisto
        e ampiezza del catalogo acquistato.
      </p>

      <div className="grid-2-charts">
        <div className="block">
          <div className="block-h">
            <span className="block-t">Fatturato mensile</span>
            <span className="mono">ultimi 12 mesi</span>
            <span style={{ flex: 1 }} />
            <Hint>
              Fatturato ordinato per ogni mese (in migliaia di euro). I mesi più alti sono evidenziati per
              leggere subito il picco di stagione.
            </Hint>
          </div>
          <div className="bars">
            {barreMensili.map((m, i) => (
              <div key={i} className={`bar${m.hi ? " hi" : ""}`} style={{ height: `${Math.max(3, (m.valore / maxMens) * 100)}%` }}>
                <span className="bv" title={`${euroK(m.valore)} in migliaia di euro`}>{euroK(m.valore)}</span>
              </div>
            ))}
          </div>
          <div className="bars-axis">
            {barreMensili.map((m, i) => <span key={i}>{m.lettera}</span>)}
          </div>
        </div>

        <div className="block">
          <div className="block-h">
            <span className="block-t">Stagionalità</span>
            <span style={{ flex: 1 }} />
            <Hint>
              Quota di fatturato per ciascun mese: evidenzia i picchi stagionali del cliente e i mesi di calo.
              Utile per pianificare proposte e promozioni.
            </Hint>
          </div>
          <div className="bars">
            {dossier.stagionalita.map((v, i) => (
              <div key={i} className={`bar${v >= maxStag * 0.75 ? " hi" : ""}`} style={{ height: `${Math.max(3, (v / maxStag) * 100)}%` }}>
                <span className="bv" title={`${euroK(v)} in migliaia di euro`}>{euroK(v)}</span>
              </div>
            ))}
          </div>
          <div className="bars-axis">
            {MESI.map((m, i) => <span key={i}>{m}</span>)}
          </div>
        </div>

        <div className="block">
          <div className="block-h">
            <span className="block-t">Composizione acquisti</span>
            <span style={{ flex: 1 }} />
            <Hint>
              Ripartizione degli acquisti per famiglia merceologica del catalogo: mostra dove si concentra il
              valore del cliente e le aree da far crescere.
            </Hint>
          </div>
          {famiglie.length > 0 ? (
            <div className="share-row">
              {famiglie.map((f) => (
                <div className="share-line" key={f.codice}>
                  <div className="share-top">
                    <span>{f.nome}</span>
                    <span className="mono">{(f.quota * 100).toFixed(0)}%</span>
                  </div>
                  <div className="share-track">
                    <div className="share-fill" style={{ width: `${f.quota * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              <p style={{ margin: "0 0 8px" }}>Nessuna famiglia a catalogo (acquisti fuori catalogo). Top prodotti:</p>
              {dossier.basket.topProdotti.slice(0, 6).map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</span>
                  <span>×{p.pezzi}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="block">
          <div className="block-h">
            <span className="block-t">Articoli più acquistati</span>
            <span className="mono">top 10 · ultimi 12 mesi</span>
            <span style={{ flex: 1 }} />
            <Hint>
              Gli articoli che il cliente acquista più spesso negli ultimi 12 mesi, con quantità totali ordinate.
            </Hint>
          </div>
          <div className="top-list">
            {dossier.basket.topProdotti.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Nessun articolo registrato.</div>
            ) : (
              dossier.basket.topProdotti.map((p, i) => (
                <div className="top-item" key={i}>
                  <span className="top-rank">{i + 1}</span>
                  <span className="top-name">{p.nome}</span>
                  <span className="top-num">{p.pezzi} pz</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.col, flexShrink: 0 }} />
        Salute {s.txt} · segmento {dossier.segmento}
      </div>
    </div>
  );
}
