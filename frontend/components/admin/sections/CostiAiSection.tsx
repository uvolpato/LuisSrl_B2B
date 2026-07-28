"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../../../lib/api";

function eur(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 4 }).format(n);
}

interface Summary {
  periodoGiorni: number;
  totale: { chiamate: number; costo: number; tokenIn: number; tokenOut: number; immagini: number };
  perTipo: { tipo: string; chiamate: number; costo: number }[];
  perModello: { modello: string; chiamate: number; costo: number }[];
  perAttore: { attoreTipo: string; attoreId: number | null; nome: string; chiamate: number; costo: number }[];
  serie: { giorno: string; costo: number; chiamate: number }[];
}

const PERIODS = [
  { days: 7, label: "7 giorni" },
  { days: 30, label: "30 giorni" },
  { days: 90, label: "90 giorni" },
  { days: 365, label: "1 anno" },
];

export default function CostiAiSection() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get<Summary>(`/api/admin/ai-usage?days=${days}`).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [days]);
  useEffect(() => { load(); }, [load]);

  const maxSerie = Math.max(1, ...(data?.serie ?? []).map((s) => s.costo));

  return (
    <div className="admin-content">
      <style>{`
        .costi-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin: 8px 0 24px; }
        .costi-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
        .costi-card .v { font-size: 24px; font-weight: 700; }
        .costi-card .l { font-size: 13px; color: var(--muted); margin-top: 4px; }
        .costi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
        .costi-tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
        .costi-tbl th { text-align: left; color: var(--muted); font-weight: 500; font-size: 12px; padding: 6px 8px; border-bottom: 1px solid var(--border); }
        .costi-tbl td { padding: 8px; border-bottom: 1px solid var(--border); }
        .costi-tbl td.num, .costi-tbl th.num { text-align: right; font-family: var(--font-mono); }
        .costi-block h3 { font-size: 15px; margin: 0 0 8px; }
        .costi-badge { font-size: 11px; padding: 1px 7px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); text-transform: capitalize; }
        .costi-serie { display: flex; align-items: flex-end; gap: 3px; height: 120px; margin-top: 8px; }
        .costi-serie .bar { flex: 1; background: var(--accent); border-radius: 3px 3px 0 0; min-height: 2px; opacity: .85; }
        .costi-serie .bar:hover { opacity: 1; }
      `}</style>

      <div className="content-header">
        <div>
          <h2>Costi AI</h2>
          <span className="meta">Stima da uso reale (token/immagini) × prezzo modello. Può differire dalla fattura Google.</span>
        </div>
        <select className="sort-select" value={days} onChange={(e) => setDays(parseInt(e.target.value, 10))}>
          {PERIODS.map((p) => <option key={p.days} value={p.days}>{p.label}</option>)}
        </select>
      </div>

      {loading && <p style={{ color: "var(--muted)" }}>Caricamento…</p>}
      {!loading && !data && <p style={{ color: "var(--muted)" }}>Nessun dato.</p>}

      {data && (
        <>
          <div className="costi-cards">
            <div className="costi-card"><div className="v">{eur(data.totale.costo)}</div><div className="l">Costo stimato</div></div>
            <div className="costi-card"><div className="v">{data.totale.chiamate.toLocaleString("it-IT")}</div><div className="l">Chiamate AI</div></div>
            <div className="costi-card"><div className="v">{(data.totale.tokenIn + data.totale.tokenOut).toLocaleString("it-IT")}</div><div className="l">Token totali</div></div>
            <div className="costi-card"><div className="v">{data.totale.immagini.toLocaleString("it-IT")}</div><div className="l">Immagini generate</div></div>
          </div>

          {data.serie.length > 0 && (
            <div className="costi-block" style={{ marginBottom: 24 }}>
              <h3>Costo per giorno</h3>
              <div className="costi-serie">
                {data.serie.map((s) => (
                  <div key={s.giorno} className="bar" style={{ height: `${(s.costo / maxSerie) * 100}%` }} title={`${s.giorno}: ${eur(s.costo)} · ${s.chiamate} chiamate`} />
                ))}
              </div>
            </div>
          )}

          <div className="costi-grid">
            <div className="costi-block">
              <h3>Per utente</h3>
              <table className="costi-tbl">
                <thead><tr><th>Utente</th><th className="num">Chiamate</th><th className="num">Costo</th></tr></thead>
                <tbody>
                  {data.perAttore.map((a, i) => (
                    <tr key={i}>
                      <td>{a.nome} <span className="costi-badge">{a.attoreTipo}</span></td>
                      <td className="num">{a.chiamate}</td>
                      <td className="num">{eur(a.costo)}</td>
                    </tr>
                  ))}
                  {data.perAttore.length === 0 && <tr><td colSpan={3} style={{ color: "var(--muted)" }}>—</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="costi-block">
              <h3>Per tipo di richiesta</h3>
              <table className="costi-tbl">
                <thead><tr><th>Tipo</th><th className="num">Chiamate</th><th className="num">Costo</th></tr></thead>
                <tbody>
                  {data.perTipo.map((t) => (
                    <tr key={t.tipo}><td style={{ textTransform: "capitalize" }}>{t.tipo}</td><td className="num">{t.chiamate}</td><td className="num">{eur(t.costo)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="costi-block">
              <h3>Per modello</h3>
              <table className="costi-tbl">
                <thead><tr><th>Modello</th><th className="num">Chiamate</th><th className="num">Costo</th></tr></thead>
                <tbody>
                  {data.perModello.map((m) => (
                    <tr key={m.modello}><td>{m.modello}</td><td className="num">{m.chiamate}</td><td className="num">{eur(m.costo)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
