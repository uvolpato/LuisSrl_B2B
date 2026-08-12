"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import Modal from "../../common/Modal";

interface Anomalia {
  id: number;
  tipo: string;
  gravita: string;
  contesto: string | null;
  messaggio: string;
  dettaglio: any;
  risolto: boolean;
  createdAt: string;
  risoltoIl: string | null;
}

const GRAV_COLORS: Record<string, string> = { info: "var(--muted)", warning: "var(--amber)", error: "var(--danger)", critical: "var(--red)" };

export default function AnomalieSection() {
  const [items, setItems] = useState<Anomalia[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState("tutti");
  const [detail, setDetail] = useState<Anomalia | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ items: Anomalia[] }>("/api/admin/anomalie?limit=200&risolto=false"),
      api.get<any>("/api/admin/anomalie/stats"),
    ]).then(([r, s]) => { setItems(r.items); setStats(s); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function risolvi(id: number) {
    await api.patch(`/api/admin/anomalie/${id}/risolvi`);
    setItems(prev => prev.map(i => i.id === id ? { ...i, risolto: true, risoltoIl: new Date().toISOString() } : i));
  }

  const filtered = filter === "tutti" ? items : items.filter(i => i.tipo === filter);

  return (
    <div className="admin-content">
      <div className="content-header">
        <div>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 24 }}>Log eventi</h2>
          <span className="meta">{items.length} eventi · {filtered.length} mostrati</span>
        </div>
      </div>

      {stats && (
        <div className="dash-grid" style={{ marginBottom: 16 }}>
          <div className="dash-card">
            <div className="label">Eventi 24h</div>
            <div className="value">{stats.total24h}</div>
          </div>
          <div className="dash-card">
            <div className="label">Errori 24h</div>
            <div className="value" style={{ color: "var(--red)" }}>{stats.error24h}</div>
          </div>
          <div className="dash-card">
            <div className="label">Richieste 24h</div>
            <div className="value">{stats.access24h}</div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {["tutti", "access", "api", "logger"].map(t => (
          <button key={t} className={`btn btn-sm ${filter === t ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter(t)}>
            {t === "tutti" ? "Tutti" : t}
          </button>
        ))}
      </div>
      <div className="data-table">
        <div className="data-table-scroll">
          <table>
            <thead><tr><th>Tipo</th><th>Gravità</th><th>Contesto</th><th>Messaggio</th><th>Data</th><th>Azioni</th></tr></thead>
            <tbody>
              {items.map(a => (
                <tr key={a.id} style={{ opacity: a.risolto ? 0.5 : 1, cursor: "pointer" }} onClick={() => setDetail(a)}>
                  <td><span className="badge code">{a.tipo}</span></td>
                  <td><span style={{ color: GRAV_COLORS[a.gravita] ?? "var(--muted)", fontWeight: 600 }}>{a.gravita}</span></td>
                  <td className="mono" style={{ fontSize: 12 }}>{a.contesto ?? "—"}</td>
                  <td style={{ maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.messaggio}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{new Date(a.createdAt).toLocaleString("it-IT")}</td>
                  <td>
                    {!a.risolto && <button className="btn btn-sm btn-ghost" onClick={() => risolvi(a.id)}>Risolvi</button>}
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && <tr><td colSpan={6} className="data-table-empty">Nessun evento</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <Modal size="md" title="Dettaglio evento" onClose={() => setDetail(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
            <div><strong>Tipo:</strong> {detail.tipo}</div>
            <div><strong>Gravità:</strong> <span style={{ color: GRAV_COLORS[detail.gravita] }}>{detail.gravita}</span></div>
            <div><strong>Messaggio:</strong> {detail.messaggio}</div>
            <div><strong>Contesto:</strong> {detail.contesto || "—"}</div>
            <div><strong>Data:</strong> {new Date(detail.createdAt).toLocaleString("it-IT")}</div>
            {detail.dettaglio && (
              <div>
                <strong>Dettagli:</strong>
                <pre style={{ marginTop: 4, padding: 8, background: "var(--fg-soft)", borderRadius: 6, fontSize: 12, overflow: "auto", maxHeight: 300 }}>
                  {JSON.stringify(detail.dettaglio, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
