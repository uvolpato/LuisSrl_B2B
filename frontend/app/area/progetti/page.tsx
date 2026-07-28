"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/use-auth";
import LoadingScreen from "../../../components/common/LoadingScreen";
import AreaHeader from "../../../components/area/AreaHeader";
import AreaFooter from "../../../components/area/AreaFooter";

function formatPrice(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

interface Progetto {
  id: number;
  nome: string;
  note: string | null;
  shareToken: string;
  count: number;
  totale: number;
  updatedAt: string;
}

export default function ProgettiPage() {
  const { user, loading } = useAuth("customer");
  const [progetti, setProgetti] = useState<Progetto[] | null>(null);
  const [nome, setNome] = useState("");
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");

  const reload = () => api.get<Progetto[]>("/api/progetti").then(setProgetti).catch(() => setProgetti([]));
  useEffect(() => { void reload(); }, []);
  // Ricerca arrivata dalla dashboard (ambito "Progetti"): ?q=
  useEffect(() => { setQ(new URLSearchParams(window.location.search).get("q") ?? ""); }, []);

  const visibili = (progetti ?? []).filter((p) => !q.trim() || p.nome.toLowerCase().includes(q.trim().toLowerCase()));

  async function create() {
    const n = nome.trim();
    if (!n || creating) return;
    setCreating(true);
    try {
      await api.post("/api/progetti", { nome: n });
      setNome("");
      await reload();
    } finally { setCreating(false); }
  }

  if (loading || !user || user.userType !== "customer") return <LoadingScreen />;

  return (
    <div className="progetti-page">
      <style>{`
        .progetti-page main { padding: 32px 20px 64px; }
        .progetti-page .container { max-width: 900px; margin: 0 auto; }
        .pg-head h1 { margin: 0 0 4px; font-size: 26px; }
        .pg-head p { margin: 0 0 20px; color: var(--muted); font-size: 14px; }
        .pg-create { display: flex; gap: 10px; margin-bottom: 24px; }
        .pg-create input { flex: 1; padding: 11px 14px; border: 1.5px solid var(--border); border-radius: 10px; background: var(--bg); font: inherit; color: var(--fg); }
        .pg-create input:focus { outline: none; border-color: var(--accent); }
        .pg-list { display: flex; flex-direction: column; gap: 10px; }
        .pg-card { display: flex; align-items: center; gap: 14px; padding: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; text-decoration: none; color: inherit; transition: border-color .15s, transform .15s; }
        .pg-card:hover { border-color: color-mix(in oklch, var(--accent) 40%, var(--border)); transform: translateY(-2px); }
        .pg-card-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; flex-shrink: 0; }
        .pg-card-name { font-weight: 600; font-size: 16px; }
        .pg-card-meta { font-size: 13px; color: var(--muted); }
      `}</style>

      <AreaHeader />

      <main>
        <div className="container">
          <div className="pg-head">
            <h1>Progetti</h1>
            <p>Componi liste di articoli nel tempo (es. un evento), condividile e riversale nel carrello quando vuoi.</p>
          </div>

          <div className="pg-create">
            <input
              type="text"
              placeholder="Nome del progetto (es. Matrimonio Rossi 12/9)…"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void create(); }}
            />
            <button className="btn btn-primary" onClick={create} disabled={creating || !nome.trim()}>
              {creating ? "Creo…" : "Nuovo progetto"}
            </button>
          </div>

          {q.trim() && <p style={{ color: "var(--muted)", fontSize: 13, marginTop: -12, marginBottom: 16 }}>Filtro: «{q}» · <button onClick={() => setQ("")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0 }}>azzera</button></p>}
          {!progetti && <p style={{ color: "var(--muted)" }}>Caricamento…</p>}
          {progetti && visibili.length === 0 && <p style={{ color: "var(--muted)" }}>{q.trim() ? "Nessun progetto corrisponde alla ricerca." : "Nessun progetto. Creane uno qui sopra."}</p>}

          <div className="pg-list">
            {visibili.map((p) => (
              <Link key={p.id} href={`/area/progetti/${p.id}`} className="pg-card">
                <span className="pg-card-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="pg-card-name">{p.nome}</div>
                  <div className="pg-card-meta">
                    {p.count} {p.count === 1 ? "articolo" : "articoli"}
                    {p.count > 0 && <> · <strong style={{ color: "var(--fg)" }}>{formatPrice(p.totale)}</strong></>}
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <AreaFooter />
    </div>
  );
}
