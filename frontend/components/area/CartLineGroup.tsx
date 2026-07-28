import Link from "next/link";
import { thumbUrl } from "../../lib/thumb";
import { formatPrice } from "../../lib/helpers";

export interface LineItem {
  varianteCodice: string;
  quantita: number;
  multiplo: number;
  articoloNome: string | null;
  articoloCodiceLinea: string | null;
  varianteDescrizione: string | null;
  dimensioni: string;
  immagineUrl: string | null;
  prezzo: { prezzoNetto: number; prezzoListino: number; sconto: number } | null;
}

/**
 * Riga/gruppo articolo condiviso tra carrello e progetti: card singola per una
 * variante, card gruppo per più varianti della stessa linea. Con prezzi, sconti,
 * multipli. Le azioni sono callback; la modalità "salva per dopo" e il blocco
 * "busy" sono opzionali (usati solo dal carrello).
 */
export default function CartLineGroup({
  group, onQty, onRemove, save, readOnlyQty = false, busyCodice = null,
}: {
  group: [string, LineItem[]];
  onQty: (codice: string, delta: -1 | 1) => void;
  onRemove: (codice: string) => void;
  save?: { label: string; onToggle: (codice: string) => void };
  readOnlyQty?: boolean;
  busyCodice?: string | null;
}) {
  const [linea, vars] = group;
  const first = vars[0];
  const img = first.immagineUrl ? (
    <img src={thumbUrl(first.immagineUrl, 200)} alt={first.articoloNome ?? ""} className="cart-item-img" />
  ) : (
    <div className="cart-item-img-placeholder">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
    </div>
  );

  const priceLine = (it: LineItem) => (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg)" }}>
      <strong>{formatPrice(it.prezzo?.prezzoNetto ?? 0)} / pz</strong>
      {(it.prezzo?.sconto ?? 0) > 0 && <> <span style={{ fontSize: 12, color: "var(--muted)", textDecoration: "line-through", marginLeft: 4 }}>{formatPrice(it.prezzo?.prezzoListino ?? 0)}</span> <span style={{ fontSize: 11, color: "var(--accent)", background: "var(--accent-soft)", padding: "1px 6px", borderRadius: 999, marginLeft: 4 }}>−{it.prezzo?.sconto ?? 0}%</span></>}
    </span>
  );

  const qtyControl = (it: LineItem) => readOnlyQty ? (
    <span className="cart-item-qty-label">{it.quantita} pz</span>
  ) : (
    <div className="qty-control">
      <button type="button" onClick={() => onQty(it.varianteCodice, -1)}>−</button>
      <input type="number" value={it.quantita} readOnly onKeyDown={(e) => e.preventDefault()} onFocus={(e) => e.target.blur()} />
      <button type="button" onClick={() => onQty(it.varianteCodice, 1)}>+</button>
    </div>
  );

  const links = (it: LineItem) => (
    <>
      {save && <button className="cart-item-link" disabled={busyCodice === it.varianteCodice} onClick={() => save.onToggle(it.varianteCodice)}>{save.label}</button>}
      <button className="cart-item-link danger" disabled={busyCodice === it.varianteCodice} onClick={() => onRemove(it.varianteCodice)}>Rimuovi</button>
    </>
  );

  if (vars.length === 1) {
    return (
      <div className="cart-item">
        <div className="cart-item-img-wrap">{img}</div>
        <div className="cart-item-info">
          <Link href={`/area/catalogo/${first.articoloCodiceLinea}`} className="cart-item-name">{first.articoloNome ?? linea}</Link>
          <span className="cart-item-variant">
            <span className="badge code">{first.varianteCodice}</span>
            {first.dimensioni && <span className="badge dim">{first.dimensioni}</span>}
          </span>
          {first.varianteDescrizione && <span className="cart-item-desc">{first.varianteDescrizione}</span>}
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            {first.multiplo > 1 && <span className="cart-item-multiplo">Multiplo: {first.multiplo} pz</span>}
            {first.multiplo > 1 && <span style={{ color: "var(--muted)", fontSize: 20, lineHeight: 1 }}>·</span>}
            {priceLine(first)}
          </div>
        </div>
        <div className="cart-item-actions">
          <span className="cart-item-price">{formatPrice(first.quantita * (first.prezzo?.prezzoNetto ?? 0))}</span>
          {qtyControl(first)}
          <div className="cart-item-links">{links(first)}</div>
        </div>
      </div>
    );
  }

  const totQty = vars.reduce((s, v) => s + v.quantita, 0);
  return (
    <div className="cart-group">
      <div className="cart-group-header">
        <div className="cart-item-img-wrap">{img}</div>
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
              {qtyControl(v)}
              <div className="cart-group-links">{links(v)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
