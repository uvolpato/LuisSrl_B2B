"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../lib/use-auth";
import LoadingScreen from "../../../../components/common/LoadingScreen";
import AreaHeader from "../../../../components/area/AreaHeader";
import AreaFooter from "../../../../components/area/AreaFooter";
import { thumbUrl } from "../../../../lib/thumb";

interface ItemP {
  varianteCodice: string;
  quantita: number;
  articoloNome: string | null;
  articoloCodiceLinea: string | null;
  varianteDescrizione: string | null;
  dimensioni: string;
  immagineUrl: string | null;
  multiplo: number;
}
interface Dettaglio {
  id: number;
  nome: string;
  note: string | null;
  shareToken: string;
  items: ItemP[];
}

export default function ProgettoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const { user, loading } = useAuth("customer");
  const router = useRouter();
  const [p, setP] = useState<Dettaglio | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = () => api.get<Dettaglio>(`/api/progetti/${id}`).then(setP).catch(() => setNotFound(true));
  useEffect(() => { void reload(); }, [id]);

  async function setQty(item: ItemP, q: number) {
    const qty = Math.max(item.multiplo, q);
    await api.patch(`/api/progetti/${id}/items/${encodeURIComponent(item.varianteCodice)}`, { quantita: qty });
    await reload();
  }
  async function removeItem(item: ItemP) {
    await api.del(`/api/progetti/${id}/items/${encodeURIComponent(item.varianteCodice)}`);
    await reload();
  }
  async function deleteProgetto() {
    if (!confirm("Eliminare definitivamente questo progetto?")) return;
    await api.del(`/api/progetti/${id}`);
    router.replace("/area/progetti");
  }
  async function addToCart() {
    if (!p) return;
    if (!confirm(`Aggiungere ${p.items.length} articoli del progetto al carrello? Gli articoli restano anche nel progetto.`)) return;
    setBusy(true);
    try {
      const res = await api.post<{ aggiunti: number; totali: number }>(`/api/progetti/${id}/aggiungi-al-carrello`);
      window.dispatchEvent(new Event("cart-updated"));
      alert(`Aggiunti ${res.aggiunti} articoli al carrello.`);
    } finally { setBusy(false); }
  }
  function copyLink() {
    if (!p) return;
    const url = `${window.location.origin}/progetti/${p.shareToken}`;
    void navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  if (loading || !user || user.userType !== "customer") return <LoadingScreen />;

  return (
    <div className="progetto-detail">
      <style>{`
        .progetto-detail main { padding: 24px 20px 64px; }
        .progetto-detail .container { max-width: 900px; margin: 0 auto; }
        .pd-back { font-size: 14px; color: var(--muted); text-decoration: none; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 16px; }
        .pd-head { display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
        .pd-head h1 { margin: 0; font-size: 24px; flex: 1; min-width: 200px; }
        .pd-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .pd-item { display: flex; align-items: center; gap: 14px; padding: 12px; border: 1px solid var(--border); border-radius: 12px; margin-bottom: 10px; background: var(--surface); }
        .pd-item-img { width: 64px; height: 64px; border-radius: 8px; object-fit: cover; background: var(--accent-soft); flex-shrink: 0; }
        .pd-item-name { font-weight: 600; }
        .pd-item-meta { font-size: 13px; color: var(--muted); }
        .pd-qty { display: inline-flex; align-items: center; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
        .pd-qty button { width: 32px; height: 32px; border: none; background: transparent; cursor: pointer; font-size: 16px; color: var(--fg); }
        .pd-qty span { min-width: 40px; text-align: center; font-size: 14px; }
        .pd-remove { background: none; border: none; color: var(--muted); cursor: pointer; padding: 6px; }
        .pd-remove:hover { color: var(--danger, #c0392b); }
      `}</style>

      <AreaHeader />

      <main>
        <div className="container">
          <Link href="/area/progetti" className="pd-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            Tutti i progetti
          </Link>

          {notFound && <p style={{ color: "var(--muted)" }}>Progetto non trovato.</p>}
          {!p && !notFound && <p style={{ color: "var(--muted)" }}>Caricamento…</p>}

          {p && (
            <>
              <div className="pd-head">
                <h1>{p.nome}</h1>
                <div className="pd-actions">
                  <button className="btn btn-secondary btn-sm" onClick={copyLink}>{copied ? "Link copiato!" : "Copia link"}</button>
                  <button className="btn btn-primary btn-sm" onClick={addToCart} disabled={busy || p.items.length === 0}>
                    {busy ? "Aggiungo…" : "Aggiungi al carrello"}
                  </button>
                  <button className="btn btn-danger-outline btn-sm" onClick={deleteProgetto}>Elimina</button>
                </div>
              </div>

              {p.items.length === 0 && (
                <p style={{ color: "var(--muted)" }}>Nessun articolo. Aggiungili dalla scheda prodotto con «Aggiungi a un progetto».</p>
              )}

              {p.items.map((it) => (
                <div key={it.varianteCodice} className="pd-item">
                  {it.immagineUrl
                    ? <img className="pd-item-img" src={thumbUrl(it.immagineUrl, 150)} alt={it.articoloNome ?? ""} />
                    : <div className="pd-item-img" />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="pd-item-name">
                      {it.articoloCodiceLinea
                        ? <Link href={`/area/catalogo/${it.articoloCodiceLinea}`} style={{ color: "inherit", textDecoration: "none" }}>{it.articoloNome}</Link>
                        : it.articoloNome}
                    </div>
                    <div className="pd-item-meta">{it.varianteDescrizione}{it.dimensioni ? ` · ${it.dimensioni}` : ""}</div>
                  </div>
                  <div className="pd-qty">
                    <button onClick={() => setQty(it, it.quantita - it.multiplo)}>−</button>
                    <span>{it.quantita}</span>
                    <button onClick={() => setQty(it, it.quantita + it.multiplo)}>+</button>
                  </div>
                  <button className="pd-remove" onClick={() => removeItem(it)} title="Rimuovi">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </main>

      <AreaFooter />
    </div>
  );
}
