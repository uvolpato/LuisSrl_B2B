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

function formatPrice(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

function groupBy<T>(items: T[], key: (t: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  items.forEach((i) => { const k = key(i); if (!map.has(k)) map.set(k, []); map.get(k)!.push(i); });
  return [...map.entries()];
}

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

  function itemImg(it: ItemP) {
    return it.immagineUrl
      ? <img src={thumbUrl(it.immagineUrl, 200)} alt={it.articoloNome ?? ""} className="cart-item-img" />
      : <div className="cart-item-img-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg></div>;
  }

  function priceLine(it: ItemP) {
    return (
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg)" }}>
        <strong>{formatPrice(it.prezzo?.prezzoNetto ?? 0)} / pz</strong>
        {(it.prezzo?.sconto ?? 0) > 0 && <> <span style={{ fontSize: 12, color: "var(--muted)", textDecoration: "line-through", marginLeft: 4 }}>{formatPrice(it.prezzo?.prezzoListino ?? 0)}</span> <span style={{ fontSize: 11, color: "var(--accent)", background: "var(--accent-soft)", padding: "1px 6px", borderRadius: 999, marginLeft: 4 }}>−{it.prezzo?.sconto ?? 0}%</span></>}
      </span>
    );
  }

  // Raggruppa le varianti della stessa linea come nel carrello.
  function renderGroup([linea, vars]: [string, ItemP[]]) {
    const first = vars[0];
    if (vars.length === 1) {
      const it = first;
      return (
        <div key={linea} className="cart-item">
          <div className="cart-item-img-wrap">{itemImg(it)}</div>
          <div className="cart-item-info">
            <Link href={`/area/catalogo/${it.articoloCodiceLinea}`} className="cart-item-name">{it.articoloNome ?? it.varianteCodice}</Link>
            <span className="cart-item-variant">
              <span className="badge code">{it.varianteCodice}</span>
              {it.dimensioni && <span className="badge dim">{it.dimensioni}</span>}
            </span>
            {it.varianteDescrizione && <span className="cart-item-desc">{it.varianteDescrizione}</span>}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              {it.multiplo > 1 && <span className="cart-item-multiplo">Multiplo: {it.multiplo} pz</span>}
              {it.multiplo > 1 && <span style={{ color: "var(--muted)", fontSize: 20, lineHeight: 1 }}>·</span>}
              {priceLine(it)}
            </div>
          </div>
          <div className="cart-item-actions">
            <span className="cart-item-price">{formatPrice(it.quantita * (it.prezzo?.prezzoNetto ?? 0))}</span>
            <div className="qty-control">
              <button type="button" onClick={() => setQty(it, it.quantita - it.multiplo)}>−</button>
              <input type="number" value={it.quantita} readOnly onKeyDown={(e) => e.preventDefault()} onFocus={(e) => e.target.blur()} />
              <button type="button" onClick={() => setQty(it, it.quantita + it.multiplo)}>+</button>
            </div>
            <div className="cart-item-links">
              <button className="cart-item-link danger" onClick={() => removeItem(it)}>Rimuovi</button>
            </div>
          </div>
        </div>
      );
    }
    const totQty = vars.reduce((s, v) => s + v.quantita, 0);
    return (
      <div key={linea} className="cart-group">
        <div className="cart-group-header">
          <div className="cart-item-img-wrap">{itemImg(first)}</div>
          <div className="cart-group-info">
            <Link href={`/area/catalogo/${first.articoloCodiceLinea}`} className="cart-item-name">{first.articoloNome ?? linea}</Link>
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
                {priceLine(v)}
              </span>
              <div className="cart-group-row-actions">
                <div className="cart-item-prices-col">
                  <span className="cart-item-price">{formatPrice(v.quantita * (v.prezzo?.prezzoNetto ?? 0))}</span>
                </div>
                <div className="qty-control">
                  <button type="button" onClick={() => setQty(v, v.quantita - v.multiplo)}>−</button>
                  <input type="number" value={v.quantita} readOnly onKeyDown={(e) => e.preventDefault()} onFocus={(e) => e.target.blur()} />
                  <button type="button" onClick={() => setQty(v, v.quantita + v.multiplo)}>+</button>
                </div>
                <div className="cart-group-links">
                  <button className="cart-item-link danger" onClick={() => removeItem(v)}>Rimuovi</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loading || !user || user.userType !== "customer") return <LoadingScreen />;

  return (
    <div className="progetto-detail catalogo-page cart-page">
      <style>{`
        .progetto-detail main { padding: 24px 20px 64px; }
        .progetto-detail .container { max-width: 900px; margin: 0 auto; }
        .pd-back { font-size: 14px; color: var(--muted); text-decoration: none; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 16px; }
        .pd-head { display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
        .pd-head h1 { margin: 0; font-size: 24px; flex: 1; min-width: 200px; }
        .pd-actions { display: flex; gap: 8px; flex-wrap: wrap; }
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

              {groupBy(p.items, (i) => i.articoloCodiceLinea ?? i.varianteCodice).map((g) => renderGroup(g))}

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

      <AreaFooter />
    </div>
  );
}
