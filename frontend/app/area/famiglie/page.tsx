"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/use-auth";
import LoadingScreen from "../../../components/common/LoadingScreen";
import AreaHeader from "../../../components/area/AreaHeader";
import AreaFooter from "../../../components/area/AreaFooter";
import { thumbUrl } from "../../../lib/thumb";

interface Famiglia {
  codice: string;
  nome: string;
  immagine: string | null;
  descrizione: string | null;
  count: number;
}

export default function FamigliePage() {
  const { user, loading } = useAuth("customer");
  const [fams, setFams] = useState<Famiglia[] | null>(null);

  useEffect(() => {
    api.get<Famiglia[]>("/api/famiglie").then(setFams).catch(() => setFams([]));
  }, []);

  if (loading || !user || user.userType !== "customer") return <LoadingScreen />;

  return (
    <div className="famiglie-page">
      <style>{`
        .famiglie-page main { padding: 32px 20px 64px; }
        .famiglie-page .container { max-width: 1200px; margin: 0 auto; }
        .fam-head h1 { margin: 0 0 4px; font-size: 26px; }
        .fam-head p { margin: 0 0 24px; color: var(--muted); font-size: 14px; }
        .fam-grid {
          display: grid; gap: 20px;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        }
        .fam-card {
          display: flex; flex-direction: column;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 14px; overflow: hidden; text-decoration: none; color: inherit;
          transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
        }
        .fam-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(0,0,0,.10);
          border-color: color-mix(in oklch, var(--accent) 40%, var(--border));
        }
        .fam-card-img { aspect-ratio: 4/3; width: 100%; object-fit: cover; background: var(--accent-soft); display: block; }
        .fam-card-img.placeholder { display: grid; place-items: center; color: var(--muted); }
        .fam-card-body { padding: 16px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .fam-card-name { font-size: 17px; font-weight: 600; margin: 0; }
        .fam-card-desc {
          font-size: 13px; color: var(--muted); margin: 0; line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .fam-card-meta {
          margin-top: auto; padding-top: 10px; font-size: 13px; color: var(--muted);
          display: flex; align-items: center; justify-content: space-between;
        }
        .fam-card-cta { color: var(--accent); font-weight: 600; }
      `}</style>

      <AreaHeader />

      <main>
        <div className="container">
          <div className="fam-head">
            <h1>Famiglie</h1>
            <p>Scegli una famiglia per esplorare gli articoli.</p>
          </div>

          {!fams && <p style={{ color: "var(--muted)" }}>Caricamento…</p>}
          {fams && fams.length === 0 && <p style={{ color: "var(--muted)" }}>Nessuna famiglia disponibile.</p>}

          <div className="fam-grid">
            {(fams ?? []).map((f) => (
              <Link key={f.codice} href={`/area/catalogo?famiglia=${encodeURIComponent(f.codice)}`} className="fam-card">
                {f.immagine ? (
                  <img className="fam-card-img" src={thumbUrl(f.immagine, 400)} alt={f.nome} />
                ) : (
                  <div className="fam-card-img placeholder">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                  </div>
                )}
                <div className="fam-card-body">
                  <h3 className="fam-card-name">{f.nome}</h3>
                  {f.descrizione && <p className="fam-card-desc">{f.descrizione}</p>}
                  <div className="fam-card-meta">
                    <span>{f.count} {f.count === 1 ? "articolo" : "articoli"}</span>
                    <span className="fam-card-cta">Esplora →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <AreaFooter />
    </div>
  );
}
