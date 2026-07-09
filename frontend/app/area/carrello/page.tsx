"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/use-auth";
import { api } from "../../../lib/api";
import LoadingScreen from "../../../components/common/LoadingScreen";
import AreaHeader from "../../../components/area/AreaHeader";
import AreaFooter from "../../../components/area/AreaFooter";

function formatPrice(n: number) {
  return "€ " + n.toFixed(2).replace(".", ",");
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
}

function groupBy<T>(items: T[], key: (t: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  items.forEach((i) => {
    const k = key(i);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(i);
  });
  return [...map.entries()];
}

export default function CarrelloPage() {
  const { user, loading: authLoading } = useAuth("customer");
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

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
    const qty = Math.max(1, item.quantita + delta);
    setBusy(codice);
    try {
      await api.patch(`/api/carrello/${encodeURIComponent(codice)}/qty`, { quantita: qty });
      setItems((prev) => prev.map((i) => i.varianteCodice === codice ? { ...i, quantita: qty } : i));
    } catch { /* ignore */ }
    setBusy(null);
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
  const subtotalAmount = activeItems.reduce((s, i) => s + i.quantita * 12.5, 0);

  if (authLoading || !user || user.userType !== "customer") return <LoadingScreen />;

  function renderGroup(group: [string, CartItem[]], salvaLabel: string, salvato: boolean) {
    const [linea, vars] = group;
    const first = vars[0];
    const img = first.immagineUrl ? (
      <img src={first.immagineUrl} alt={first.articoloNome ?? ""} className="cart-item-img" />
    ) : (
      <div className="cart-item-img-placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
      </div>
    );

    if (vars.length === 1) {
      return (
        <div key={linea} className="cart-item">
          <div className="cart-item-img-wrap">{img}</div>
          <div className="cart-item-info">
            <Link href={`/area/catalogo/${first.articoloCodiceLinea}`} className="cart-item-name">
              {first.articoloNome ?? linea}
            </Link>
            <span className="cart-item-variant">
              <span className="badge code">{first.varianteCodice}</span>
              {first.dimensioni && <span className="badge dim">{first.dimensioni}</span>}
            </span>
            {first.varianteDescrizione && <span className="cart-item-desc">{first.varianteDescrizione}</span>}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              {first.multiplo > 1 && <span className="cart-item-multiplo">Multiplo: {first.multiplo} pz</span>}
              {first.multiplo > 1 && <span style={{ color: "var(--muted)", fontSize: 20, lineHeight: 1 }}>·</span>}
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg)" }}><strong>{formatPrice(12.5)} / pz</strong> <span style={{ fontSize: 12, color: "var(--muted)", textDecoration: "line-through", marginLeft: 4 }}>€ 18,00</span> <span style={{ fontSize: 11, color: "var(--accent)", background: "var(--accent-soft)", padding: "1px 6px", borderRadius: 999, marginLeft: 4 }}>−31%</span></span>
            </div>
          </div>
          <div className="cart-item-actions">
            <span className="cart-item-price">{formatPrice(first.quantita * 12.5)}</span>
            {salvato ? (
              <span className="cart-item-qty-label">{first.quantita} pz</span>
            ) : (
              <div className="qty-control">
                <button type="button" disabled={busy === first.varianteCodice} onClick={() => changeQty(first.varianteCodice, -1)}>−</button>
                <input type="number" value={first.quantita} readOnly onKeyDown={(e) => e.preventDefault()} onFocus={(e) => e.target.blur()} />
                <button type="button" disabled={busy === first.varianteCodice} onClick={() => changeQty(first.varianteCodice, 1)}>+</button>
              </div>
            )}
            <div className="cart-item-links">
              <button className="cart-item-link" disabled={busy === first.varianteCodice} onClick={() => toggleSave(first.varianteCodice)}>{salvaLabel}</button>
              <button className="cart-item-link danger" disabled={busy === first.varianteCodice} onClick={() => remove(first.varianteCodice)}>Rimuovi</button>
            </div>
          </div>
        </div>
      );
    }

    const totQty = vars.reduce((s, v) => s + v.quantita, 0);
    return (
      <div key={linea} className="cart-group">
        <div className="cart-group-header">
          <div className="cart-item-img-wrap">{img}</div>
          <div className="cart-group-info">
            <Link href={`/area/catalogo/${first.articoloCodiceLinea}`} className="cart-item-name">
              {first.articoloNome ?? linea}
            </Link>
            <span className="cart-group-qty">{totQty} pz</span>
          </div>
        </div>
        <div className="cart-group-variants">
          {vars.map((v) => (
            <div key={v.varianteCodice} className="cart-group-row">
              <span className="cart-item-variant">
                <span className="badge code">{v.varianteCodice}</span>
                {v.dimensioni && <span className="badge dim">{v.dimensioni}</span>}
                {v.varianteDescrizione && <span className="cart-item-desc">{v.varianteDescrizione}</span>}
                {v.multiplo > 1 && <span className="cart-item-multiplo">Multiplo: {v.multiplo} pz</span>}
                {v.multiplo > 1 && <span style={{ color: "var(--muted)", fontSize: 20, lineHeight: 1 }}>·</span>}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg)" }}><strong>{formatPrice(12.5)} / pz</strong> <span style={{ fontSize: 12, color: "var(--muted)", textDecoration: "line-through", marginLeft: 4 }}>€ 18,00</span> <span style={{ fontSize: 11, color: "var(--accent)", background: "var(--accent-soft)", padding: "1px 6px", borderRadius: 999, marginLeft: 4 }}>−31%</span></span>
              </span>
              <div className="cart-group-row-actions">
                <div className="cart-item-prices-col">
                  <span className="cart-item-price">{formatPrice(v.quantita * 12.5)}</span>
                </div>
                {salvato ? (
                  <span className="cart-item-qty-label">{v.quantita} pz</span>
                ) : (
                  <div className="qty-control">
                    <button type="button" disabled={busy === v.varianteCodice} onClick={() => changeQty(v.varianteCodice, -1)}>−</button>
                    <input type="number" value={v.quantita} readOnly onKeyDown={(e) => e.preventDefault()} onFocus={(e) => e.target.blur()} />
                    <button type="button" disabled={busy === v.varianteCodice} onClick={() => changeQty(v.varianteCodice, 1)}>+</button>
                  </div>
                )}
                <div className="cart-group-links">
                  <button className="cart-item-link" disabled={busy === v.varianteCodice} onClick={() => toggleSave(v.varianteCodice)}>{salvaLabel}</button>
                  <button className="cart-item-link danger" disabled={busy === v.varianteCodice} onClick={() => remove(v.varianteCodice)}>Rimuovi</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="catalogo-page cart-page">
      <AreaHeader />
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
                      {activeGroups.map((g) => renderGroup(g, "Salva per dopo", false))}
                    </div>
                  </>
                )}

                {savedGroups.length > 0 && (
                  <>
                    <h2 className="cart-section-title" style={{ marginTop: 40 }}>Acquista dopo ({savedItems.length} varianti)</h2>
                    <div className="cart-groups saved">
                      {savedGroups.map((g) => renderGroup(g, "Sposta nel carrello", true))}
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
                <button className="btn btn-primary checkout-btn" disabled>
                  Procedi al checkout
                </button>
                <Link href="/area/catalogo" className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
                  Continua lo shopping
                </Link>
              </aside>
            </div>
          )}
        </div>
      </main>
      <AreaFooter />
    </div>
  );
}
