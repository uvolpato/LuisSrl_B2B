"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../lib/use-auth";
import LoadingScreen from "../../../../components/common/LoadingScreen";

import { formatPrice, groupBy } from "../../../../lib/helpers";
import CartLineGroup from "../../../../components/area/CartLineGroup";


interface ItemP {
  varianteCodice: string;
  quantita: number;
  articoloNome: string | null;
  articoloCodiceLinea: string | null;
  varianteDescrizione: string | null;
  dimensioni: string;
  immagineUrl: string | null;
  multiplo: number;
  prezzo: { prezzoNetto: number; prezzoListino: number; sconto: number } | null;
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
    <div className="progetto-detail catalogo-page cart-page">
      <style>{`
        .progetto-detail main { padding: 28px 20px 64px; }
        .progetto-detail .container { max-width: 900px; margin: 0 auto; }
        .pd-back { font-size: 14px; color: var(--muted); text-decoration: none; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 16px; }
        .pd-head { display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
        .pd-head h1 { margin: 0; font-family: var(--font-display); font-size: clamp(28px, 3.5vw, 40px); flex: 1; min-width: 200px; }
        .pd-actions { display: flex; gap: 8px; flex-wrap: wrap; }
      `}</style>

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

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {groupBy(p.items, (i) => i.articoloCodiceLinea ?? i.varianteCodice).map((g) => (
                  <CartLineGroup key={g[0]} group={g}
                    onQty={(codice, delta) => { const it = p.items.find((i) => i.varianteCodice === codice); if (it) setQty(it, it.quantita + delta * it.multiplo); }}
                    onRemove={(codice) => { const it = p.items.find((i) => i.varianteCodice === codice); if (it) removeItem(it); }} />
                ))}
              </div>

              {p.items.length > 0 && (
                <div style={{ marginTop: 20, marginLeft: "auto", maxWidth: 340, border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--surface)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--muted)" }}>
                    <span>Subtotale ({p.items.reduce((s, i) => s + i.quantita, 0)} pz)</span>
                    <span>{formatPrice(p.items.reduce((s, i) => s + i.quantita * (i.prezzo?.prezzoNetto ?? 0), 0))}</span>
                  </div>
                  <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 600 }}>
                    <span>Totale IVA esclusa</span>
                    <span>{formatPrice(p.items.reduce((s, i) => s + i.quantita * (i.prezzo?.prezzoNetto ?? 0), 0))}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

    </div>
  );
}
