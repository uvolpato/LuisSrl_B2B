"use client";

import { useEffect, useState, use as usePromise } from "react";
import { api } from "../../../lib/api";
import { thumbUrl } from "../../../lib/thumb";

interface ItemP {
  varianteCodice: string;
  quantita: number;
  articoloNome: string | null;
  varianteDescrizione: string | null;
  dimensioni: string;
  immagineUrl: string | null;
}
interface Pubblico {
  nome: string;
  note: string | null;
  items: ItemP[];
}

export default function ProgettoPubblicoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = usePromise(params);
  const [p, setP] = useState<Pubblico | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get<Pubblico>(`/api/progetti/pubblico/${encodeURIComponent(token)}`).then(setP).catch(() => setNotFound(true));
  }, [token]);

  return (
    <div className="pgpub">
      <style>{`
        .pgpub { min-height: 100vh; background: var(--bg); }
        .pgpub-header { border-bottom: 1px solid var(--border); padding: 16px 20px; display: flex; align-items: center; gap: 10px; }
        .pgpub-header img { height: 30px; }
        .pgpub-main { max-width: 820px; margin: 0 auto; padding: 32px 20px 64px; }
        .pgpub-main h1 { margin: 0 0 4px; font-size: 24px; }
        .pgpub-sub { color: var(--muted); font-size: 14px; margin: 0 0 24px; }
        .pgpub-item { display: flex; align-items: center; gap: 14px; padding: 12px; border: 1px solid var(--border); border-radius: 12px; margin-bottom: 10px; background: var(--surface); }
        .pgpub-item img { width: 64px; height: 64px; border-radius: 8px; object-fit: cover; background: var(--accent-soft); flex-shrink: 0; }
        .pgpub-name { font-weight: 600; }
        .pgpub-meta { font-size: 13px; color: var(--muted); }
        .pgpub-qty { font-size: 14px; color: var(--fg); font-weight: 600; white-space: nowrap; }
      `}</style>

      <div className="pgpub-header">
        <img src="/images/b2b/logo.webp" alt="Luis S.r.l." />
      </div>

      <div className="pgpub-main">
        {notFound && <p style={{ color: "var(--muted)" }}>Lista non trovata o non più disponibile.</p>}
        {!p && !notFound && <p style={{ color: "var(--muted)" }}>Caricamento…</p>}
        {p && (
          <>
            <h1>{p.nome}</h1>
            <p className="pgpub-sub">Lista condivisa · {p.items.length} {p.items.length === 1 ? "articolo" : "articoli"}</p>
            {p.items.map((it) => (
              <div key={it.varianteCodice} className="pgpub-item">
                {it.immagineUrl ? <img src={thumbUrl(it.immagineUrl, 150)} alt={it.articoloNome ?? ""} /> : <div className="pgpub-item" style={{ padding: 0, border: "none" }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="pgpub-name">{it.articoloNome}</div>
                  <div className="pgpub-meta">{it.varianteDescrizione}{it.dimensioni ? ` · ${it.dimensioni}` : ""}</div>
                </div>
                <span className="pgpub-qty">× {it.quantita}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
