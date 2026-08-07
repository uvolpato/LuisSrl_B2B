"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";

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

  useEffect(() => {
    api.get<{ items: Anomalia[] }>("/api/admin/anomalie?limit=200&risolto=false")
      .then(r => setItems(r.items)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function risolvi(id: number) {
    await api.patch(`/api/admin/anomalie/${id}/risolvi`);
    setItems(prev => prev.map(i => i.id === id ? { ...i, risolto: true, risoltoIl: new Date().toISOString() } : i));
  }

  return (
    <div className="admin-content">
      <div className="content-header">
        <div>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 24 }}>Anomalie</h2>
          <span className="meta">{items.length} anomalie aperte</span>
        </div>
      </div>
      <div className="data-table">
        <div className="data-table-scroll">
          <table>
            <thead><tr><th>Tipo</th><th>Gravità</th><th>Contesto</th><th>Messaggio</th><th>Data</th><th>Azioni</th></tr></thead>
            <tbody>
              {items.map(a => (
                <tr key={a.id} style={{ opacity: a.risolto ? 0.5 : 1 }}>
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
              {!loading && items.length === 0 && <tr><td colSpan={6} className="data-table-empty">Nessuna anomalia</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
