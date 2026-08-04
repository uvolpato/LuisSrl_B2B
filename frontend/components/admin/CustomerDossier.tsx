"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { formatPrice } from "../../lib/helpers";
import CustomerTimeline from "./CustomerTimeline";

interface Kpi {
  fatturato12m: number; trendYoY: number | null; fatturatoTotale: number;
  ticketMedio: number | null; ordiniTotali: number; ordini12m: number;
  ordiniPerAnno: number | null; giorniDaUltimoOrdine: number | null;
  cadenzaMediaGiorni: number | null; ultimoOrdine: string | null;
}
interface Famiglia { codice: string; nome: string; valore: number; pezzi: number; quota: number }
interface Dossier {
  kpi: Kpi;
  stagionalita: number[];
  basket: { famiglie: Famiglia[]; topProdotti: { nome: string; pezzi: number }[]; nFamiglie: number; nArticoli: number; concentrazioneHHI: number };
  segmento: string;
  salute: "buona" | "media" | "a_rischio";
}

const MESI = ["G", "F", "M", "A", "M", "G", "L", "A", "S", "O", "N", "D"];
const SALUTE: Record<Dossier["salute"], { txt: string; col: string }> = {
  buona: { txt: "buona", col: "#16a34a" },
  media: { txt: "media", col: "#d97706" },
  a_rischio: { txt: "a rischio", col: "#dc2626" },
};

function Trend({ v }: { v: number | null }) {
  if (v == null) return <span style={{ fontSize: 11, color: "var(--muted)" }}>—</span>;
  const up = v >= 0;
  return <span style={{ fontSize: 11, color: up ? "#16a34a" : "#dc2626" }}>{up ? "▲" : "▼"} {(v * 100).toFixed(0)}% YoY</span>;
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12, background: "var(--surface)" }}>
      <div style={{ color: "var(--muted)", fontSize: 11 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: 11 }}>{sub}</div>}
    </div>
  );
}

export default function CustomerDossier({ customerId }: { customerId: number }) {
  const [d, setD] = useState<Dossier | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    api.get<Dossier>(`/api/admin/customers/${customerId}/dossier`).then(setD).catch(() => setErr(true));
  }, [customerId]);

  if (err) return <p style={{ color: "var(--muted)" }}>Impossibile caricare il dossier.</p>;
  if (!d) return <p style={{ color: "var(--muted)" }}>Caricamento dossier…</p>;

  const k = d.kpi;
  const s = SALUTE[d.salute];
  const maxStag = Math.max(1, ...d.stagionalita);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header segmento */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ background: s.col, color: "#fff", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{d.segmento}</span>
        <span style={{ border: "1px solid var(--border)", padding: "3px 10px", borderRadius: 999, fontSize: 12 }}>
          Salute <span style={{ color: s.col }}>●</span> {s.txt}
        </span>
        {k.ultimoOrdine && (
          <span style={{ border: "1px solid var(--border)", padding: "3px 10px", borderRadius: 999, fontSize: 12, color: "var(--muted)" }}>
            Ultimo ordine {k.giorniDaUltimoOrdine} gg fa
          </span>
        )}
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
        <Tile label="Fatturato 12m" value={formatPrice(k.fatturato12m)} sub={<Trend v={k.trendYoY} />} />
        <Tile label="Fatturato totale" value={formatPrice(k.fatturatoTotale)} sub={`${k.ordiniTotali} ordini`} />
        <Tile label="Ticket medio" value={k.ticketMedio != null ? formatPrice(k.ticketMedio) : "—"} />
        <Tile label="Cadenza" value={k.cadenzaMediaGiorni != null ? `~${k.cadenzaMediaGiorni} gg` : "—"} sub={k.ordiniPerAnno != null ? `${k.ordiniPerAnno} ordini/anno` : undefined} />
        <Tile label="Assortimento" value={`${d.basket.nFamiglie} fam.`} sub={`${d.basket.nArticoli} articoli`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Stagionalità */}
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 14, background: "var(--surface)" }}>
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>Stagionalità (fatturato / mese)</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 70 }}>
            {d.stagionalita.map((v, i) => (
              <div key={i} title={formatPrice(v)} style={{ flex: 1, background: v >= maxStag * 0.66 ? "var(--accent)" : "color-mix(in oklch, var(--accent) 45%, transparent)", height: `${Math.max(3, (v / maxStag) * 100)}%`, borderRadius: "2px 2px 0 0" }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: 10, marginTop: 4 }}>
            {MESI.map((m, i) => <span key={i}>{m}</span>)}
          </div>
        </div>

        {/* Basket */}
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 14, background: "var(--surface)" }}>
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>Composizione acquisti</div>
          {d.basket.famiglie.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {d.basket.famiglie.slice(0, 5).map((f) => (
                <div key={f.codice}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nome}</span>
                    <span>{(f.quota * 100).toFixed(0)}%</span>
                  </div>
                  <div style={{ background: "var(--bg)", borderRadius: 4, height: 7 }}>
                    <div style={{ background: "var(--accent)", width: `${f.quota * 100}%`, height: 7, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              <p style={{ margin: "0 0 8px" }}>Nessuna famiglia a catalogo (acquisti fuori catalogo). Top prodotti:</p>
              {d.basket.topProdotti.slice(0, 6).map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</span>
                  <span>×{p.pezzi}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Attività (timeline) collassabile */}
      <details style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)" }}>
        <summary style={{ padding: "12px 14px", cursor: "pointer", fontSize: 13, color: "var(--muted)" }}>
          Attività sul portale e sintesi AI
        </summary>
        <div style={{ padding: "0 14px 14px" }}>
          <CustomerTimeline customerId={customerId} />
        </div>
      </details>
    </div>
  );
}
