"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/use-auth";
import { api } from "../../../lib/api";
import LoadingScreen from "../../../components/common/LoadingScreen";
import AddToProjectModal from "../../../components/area/AddToProjectModal";
import CartLineGroup from "../../../components/area/CartLineGroup";
import { formatPrice, groupBy } from "../../../lib/helpers";

interface PrezzoInfo {
  prezzoNetto: number;
  prezzoListino: number;
  sconto: number;
}

interface CartItem {
  id: number;
  varianteCodice: string;
  quantita: number;
  salvato: boolean;
  articoloNome: string | null;
  articoloCodiceLinea: string | null;
  varianteDescrizione: string | null;
  dimensioni: string;
  immagineUrl: string | null;
  multiplo: number;
  prezzo: PrezzoInfo | null;
}


export default function CarrelloPage() {
  const { user, loading: authLoading } = useAuth("customer");
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [projOpen, setProjOpen] = useState(false);
  const [projItems, setProjItems] = useState<{ varianteCodice: string; quantita: number }[]>([]);

  const fetchCart = useCallback(async () => {
    try {
      const res = await api.get<{ id: number; items: any[] }>("/api/carrello");
      setItems(res.items);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && user) fetchCart();
  }, [authLoading, user, fetchCart]);

  function notifyCart() { window.dispatchEvent(new CustomEvent("cart-updated")); }

  async function changeQty(codice: string, delta: number) {
    const item = items.find((i) => i.varianteCodice === codice);
    if (!item) return;
    const step = item.multiplo > 1 ? item.multiplo : 1;
    const min = item.multiplo > 1 ? item.multiplo : 1;
    const qty = Math.max(min, item.quantita + delta * step);
    setItems((prev) => prev.map((i) => i.varianteCodice === codice ? { ...i, quantita: qty } : i));
    try {
      await api.patch(`/api/carrello/${encodeURIComponent(codice)}/qty`, { quantita: qty });
    } catch {
      setItems((prev) => prev.map((i) => i.varianteCodice === codice ? { ...i, quantita: item.quantita } : i));
    }
  }

  async function toggleSave(codice: string) {
    setBusy(codice);
    try {
      await api.patch(`/api/carrello/${encodeURIComponent(codice)}/salva`, {});
      setItems((prev) => prev.map((i) => i.varianteCodice === codice ? { ...i, salvato: !i.salvato } : i));
      notifyCart();
    } catch { /* ignore */ }
    setBusy(null);
  }

  async function remove(codice: string) {
    setBusy(codice);
    try {
      await api.del(`/api/carrello/${encodeURIComponent(codice)}`);
      setItems((prev) => prev.filter((i) => i.varianteCodice !== codice));
      notifyCart();
    } catch { /* ignore */ }
    setBusy(null);
  }

  const activeItems = items.filter((i) => !i.salvato);
  const savedItems = items.filter((i) => i.salvato);
  const activeGroups = useMemo(() => groupBy(activeItems, (i) => i.articoloCodiceLinea ?? i.varianteCodice), [activeItems]);
  const savedGroups = useMemo(() => groupBy(savedItems, (i) => i.articoloCodiceLinea ?? i.varianteCodice), [savedItems]);
  const subtotalQty = activeItems.reduce((s, i) => s + i.quantita, 0);
  const subtotalAmount = activeItems.reduce((s, i) => s + i.quantita * (i.prezzo?.prezzoNetto ?? 0), 0);

  if (authLoading || !user || user.userType !== "customer") return <LoadingScreen />;


  return (
    <div className="catalogo-page cart-page">
      <main id="content">
        <div className="container">
          <div className="page-title">
            <h1>Il tuo carrello</h1>
          </div>

          {loading ? (
            <p style={{ paddingBlock: 48, color: "var(--muted)" }}>Caricamento…</p>
          ) : items.length === 0 ? (
            <div style={{ paddingBlock: 48, textAlign: "center" }}>
              <p style={{ color: "var(--muted)", marginBottom: 20 }}>Il carrello è vuoto.</p>
              <Link href="/area/catalogo" className="btn btn-primary">Continua lo shopping</Link>
            </div>
          ) : (
            <div className="cart-layout">
              <div className="cart-items-col">
                {activeGroups.length > 0 && (
                  <>
                    <h2 className="cart-section-title">Articoli ({activeItems.length} varianti)</h2>
                    <div className="cart-groups">
                      {activeGroups.map((g) => (
                        <CartLineGroup key={g[0]} group={g} onQty={changeQty} onRemove={remove}
                          save={{ label: "Salva per dopo", onToggle: toggleSave }} busyCodice={busy} />
                      ))}
                    </div>
                  </>
                )}

                {savedGroups.length > 0 && (
                  <>
                    <h2 className="cart-section-title" style={{ marginTop: 40 }}>Acquista dopo ({savedItems.length} varianti)</h2>
                    <div className="cart-groups saved">
                      {savedGroups.map((g) => (
                        <CartLineGroup key={g[0]} group={g} onQty={changeQty} onRemove={remove}
                          save={{ label: "Sposta nel carrello", onToggle: toggleSave }} readOnlyQty busyCodice={busy} />
                      ))}
                    </div>
                  </>
                )}
              </div>

              <aside className="order-summary">
                <h2>Riepilogo ordine</h2>
                <div className="summary-row">
                  <span className="label">Subtotale ({subtotalQty} pz)</span>
                  <span className="value">{formatPrice(subtotalAmount)}</span>
                </div>
                <hr className="summary-divider" />
                <div className="summary-total">
                  <span className="label">Totale IVA esclusa</span>
                  <span className="value">{formatPrice(subtotalAmount)}</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 0" }}>
                  IVA non inclusa · Spese di trasporto calcolate al checkout
                </p>
                <Link href="/area/checkout" className="btn btn-primary checkout-btn">
                  Procedi al checkout
                </Link>
                <button className="btn btn-secondary btn-progetto" disabled={!activeItems.length}
                  onClick={() => { setProjItems(activeItems.map((i) => ({ varianteCodice: i.varianteCodice, quantita: i.quantita }))); setProjOpen(true); }}
                  style={{ width: "100%", justifyContent: "center", gap: 8, padding: 12, fontSize: 15, marginTop: 8, opacity: activeItems.length === 0 ? 0.5 : 1 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                  Aggiungi a un progetto
                </button>
                <Link href="/area/catalogo" className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
                  Continua lo shopping
                </Link>
              </aside>
            </div>
          )}
        </div>
      </main>
      <AddToProjectModal
        open={projOpen}
        onClose={() => setProjOpen(false)}
        items={projItems}
        onAdded={async () => {
          for (const it of projItems) {
            try { await api.del(`/api/carrello/${encodeURIComponent(it.varianteCodice)}`); } catch { }
          }
          notifyCart();
          await fetchCart();
        }}
      />
    </div>
  );
}
