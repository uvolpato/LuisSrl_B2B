"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../../lib/use-auth";
import { api } from "../../../../lib/api";
import LoadingScreen from "../../../../components/common/LoadingScreen";
import AreaHeader from "../../../../components/area/AreaHeader";
import AreaFooter from "../../../../components/area/AreaFooter";
import PositionedImage from "../../../../components/common/PositionedImage";
import { parseImgCss } from "../../../../lib/img-css";

interface DimEntry {
  codice: string;
  descrizione: string;
  valore: number;
}

interface PrezzoInfo {
  prezzoNetto: number;
  prezzoListino: number;
  sconto: number;
}

interface Variante {
  codice: string;
  descrizione: string;
  dimensioni: Record<string, DimEntry> | null;
  multiplo: number;
  giacenza: number;
  stato: string;
  prezzo: PrezzoInfo | null;
}

interface Immagine {
  id: number;
  url: string;
  ordinamento: number;
  copertina: boolean;
  tipo: string;
  inGalleria: boolean;
  css: string;
}

interface Raccolta {
  id: number;
  nome: string;
  slug: string;
  sconto: number | null;
  stato: string;
}

interface Articolo {
  id: string;
  codiceLinea: string;
  nome: string;
  colore: string | null;
  coloreRgb: string | null;
  stato: string;
  configurato: boolean;
  famiglia: { codice: string; nome: string };
  variantiCount: number;
  updatedAt: string;
  descrizione: string | null;
  descrizioneAI: string | null;
  descrizioneDettagliata: string | null;
  raccolte: Raccolta[];
  varianti: Variante[];
  immagini: Immagine[];
}

const STOCK_LABELS: Record<string, string> = { ok: "Disponibile", low: "Scorte limitate", out: "Esaurito" };
const STOCK_CLASS: Record<string, string> = { ok: "stock-ok", low: "stock-low", out: "stock-out" };

function formatPrice(n: number) {
  return "€ " + n.toFixed(2).replace(".", ",");
}

function getStock(giacenza: number): "ok" | "low" | "out" {
  if (giacenza <= 0) return "out";
  if (giacenza < 10) return "low";
  return "ok";
}

// Listini non ancora integrati: prezzi di esempio fissi e deterministici per variante.
function variantExamplePrice(codice: string) {
  let h = 0;
  for (let i = 0; i < codice.length; i++) h = (h * 31 + codice.charCodeAt(i)) >>> 0;
  const net = Math.round((8 + ((h % 50) / 2)) * 100) / 100; // 8,00 – 32,50
  const disc = 15 + (h % 30); // 15% – 44%
  const list = Math.round((net / (1 - disc / 100)) * 100) / 100;
  return { net, list, disc };
}

export default function SchedaArticoloPage({ params }: { params: Promise<{ codiceLinea: string }> }) {
  const [paramsResolved, setParamsResolved] = useState<{ codiceLinea: string } | null>(null);
  useEffect(() => {
    params.then(setParamsResolved);
  }, [params]);

  const { user, loading: authLoading } = useAuth("customer");

  const [articolo, setArticolo] = useState<Articolo | null>(null);
  const [loading, setLoading] = useState(true);

  const codiceLinea = paramsResolved?.codiceLinea;

  useEffect(() => {
    if (!codiceLinea) return;
    setLoading(true);
    fetch(`/api/catalogo/${encodeURIComponent(codiceLinea)}`)
      // Solo una risposta valida diventa l'articolo: un 404/errore NON deve
      // finire in `articolo` (altrimenti immagini/varianti sono undefined → crash)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setArticolo(d); setLoading(false); })
      .catch(() => { setArticolo(null); setLoading(false); });
  }, [codiceLinea]);

  const galleryImages = useMemo(() => {
    if (!articolo) return [];
    return articolo.immagini.filter((i) => i.inGalleria).sort((a, b) => a.ordinamento - b.ordinamento);
  }, [articolo]);
  const allImages = useMemo(() => {
    if (!articolo) return [];
    return [...articolo.immagini].sort((a, b) => a.ordinamento - b.ordinamento);
  }, [articolo]);

  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [selDim, setSelDim] = useState<Record<string, string>>({});
  const [gridFilter, setGridFilter] = useState<Record<string, string>>({});
  const [buyQty, setBuyQty] = useState<number | null>(null);
  const [gridQtys, setGridQtys] = useState<Record<string, number>>({});
  const [addBtnText, setAddBtnText] = useState("Aggiungi al carrello");
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [galleryModalIdx, setGalleryModalIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const varianti = useMemo(() => {
    if (!articolo) return [];
    return articolo.varianti.filter((v) => v.stato === "attivo");
  }, [articolo]);

  const dimKeys = useMemo(() => {
    const keys = new Set<string>();
    varianti.forEach((v) => { if (v.dimensioni) Object.keys(v.dimensioni).forEach((k) => keys.add(k)); });
    const order = ["diametro", "altezza", "larghezza", "profondita"];
    return [...keys].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [varianti]);

  function activeEntries(dimState: Record<string, string>) {
    return Object.entries(dimState).filter(([, v]) => v);
  }

  function getAvailableValues(key: string, dimState: Record<string, string> = selDim): string[] {
    if (dimKeys.indexOf(key) === -1) return [];
    const other = activeEntries(dimState).filter(([k]) => k !== key);
    if (!other.length) {
      const all = new Set<string>();
      varianti.forEach((v) => {
        const e = v.dimensioni?.[key];
        if (e?.valore != null) all.add(String(e.valore));
      });
      return [...all].sort((a, b) => Number(a) - Number(b));
    }
    const matching = varianti.filter((v) =>
      other.every(([pk, val]) => String(v.dimensioni?.[pk]?.valore ?? "") === val)
    );
    const vals = new Set<string>();
    matching.forEach((v) => {
      const e = v.dimensioni?.[key];
      if (e?.valore != null) vals.add(String(e.valore));
    });
    return [...vals].sort((a, b) => Number(a) - Number(b));
  }

  function cascadeSelect(dimState: Record<string, string>, key: string, value: string): Record<string, string> {
    const next = { ...dimState, [key]: value };
    if (!value) return next;
    dimKeys.forEach((k) => {
      if (k === key || !next[k]) return;
      const compatibile = varianti.some((v) =>
        String(v.dimensioni?.[key]?.valore ?? "") === value &&
        String(v.dimensioni?.[k]?.valore ?? "") === next[k]
      );
      if (!compatibile) delete next[k];
    });
    return next;
  }

  const filteredVarianti = useMemo(() => {
    const active = Object.entries(gridFilter).filter(([, v]) => v);
    let list = varianti;
    if (!active.length) return list;
    return list.filter((v) =>
      active.every(([key, val]) => String(v.dimensioni?.[key]?.valore ?? "") === val)
    );
  }, [varianti, gridFilter]);

  const selectedVariant = useMemo(() => {
    const active = Object.entries(selDim).filter(([, v]) => v);
    if (active.length !== dimKeys.length) return null;
    return varianti.find((v) =>
      dimKeys.every((key) => String(v.dimensioni?.[key]?.valore ?? "") === (selDim[key] ?? ""))
    ) ?? null;
  }, [varianti, selDim, dimKeys]);

  const singleVariant = varianti.length === 1 ? varianti[0] : null;

  const buyVariant = selectedVariant || singleVariant;
  const buyOut = buyVariant ? getStock(buyVariant.giacenza) === "out" : false;

  useEffect(() => {
    if (singleVariant) {
      const auto: Record<string, string> = {};
      dimKeys.forEach((key) => {
        const e = singleVariant.dimensioni?.[key];
        if (e?.valore != null) auto[key] = String(e.valore);
      });
      setSelDim(auto);
      setBuyQty(singleVariant.multiplo);
    } else {
      setSelDim({});
      setBuyQty(null);
    }
  }, [singleVariant, dimKeys]);

  function selectThumb(idx: number) {
    if (idx >= galleryImages.length) idx = 0;
    setSelectedImgIdx(idx);
  }

  function openLightbox(idx?: number) {
    setLightboxIdx(idx ?? selectedImgIdx);
    setLightboxOpen(true);
  }

  function lbNav(delta: number) {
    setLightboxIdx((prev) => (prev + delta + allImages.length) % allImages.length);
    setSelectedImgIdx((prev) => (prev + delta + galleryImages.length) % galleryImages.length);
  }

  function openGalleryModal(startIdx?: number) {
    setGalleryModalIdx(startIdx ?? selectedImgIdx);
    setGalleryModalOpen(true);
  }

  function galleryModalNav(dir: number) {
    setGalleryModalIdx((prev) => (prev + dir + allImages.length) % allImages.length);
  }

  const qtyStep = selectedVariant?.multiplo || 1;

  function changeBuyQty(delta: number) {
    setBuyQty((prev) => {
      const step = selectedVariant?.multiplo || 1;
      const cur = prev ?? step;
      const next = Math.max(step, Math.round((cur + delta) / step) * step);
      return next;
    });
  }

  useEffect(() => {
    if (selectedVariant) {
      setBuyQty((prev) => prev ?? selectedVariant.multiplo);
    }
  }, [selectedVariant]);

  const gridTotals = useMemo(() => {
    let count = 0;
    let total = 0;
    filteredVarianti.forEach((v) => {
      const q = gridQtys[v.codice] || 0;
      if (q > 0) {
        count++;
        total += (v.prezzo?.prezzoNetto ?? 0) * q;
      }
    });
    return { count, total: Math.round(total * 100) / 100 };
  }, [filteredVarianti, gridQtys]);

  function gridQty(codice: string, delta: number) {
    setGridQtys((prev) => {
      const v = varianti.find((x) => x.codice === codice);
      const step = v?.multiplo || 6;
      const cur = prev[codice] || 0;
      const next = Math.max(0, Math.round((cur + delta) / step) * step);
      return { ...prev, [codice]: next };
    });
  }

  function gridQtyDirect(codice: string, val: number) {
    setGridQtys((prev) => ({ ...prev, [codice]: Math.max(0, val) }));
  }

  function notifyCart() { window.dispatchEvent(new CustomEvent("cart-updated")); }

  async function addSingleToCart() {
    const v = selectedVariant || singleVariant;
    if (!v) return;
    try {
      await api.post("/api/carrello", { varianteCodice: v.codice, quantita: buyQty ?? v.multiplo });
      notifyCart();
      setBuyBtnText("Aggiunto ✓");
      setTimeout(() => setBuyBtnText("Aggiungi al carrello"), 2000);
    } catch { /* ignore */ }
  }

  const [buyBtnText, setBuyBtnText] = useState("Aggiungi al carrello");

  async function addAllToCart() {
    const toAdd = filteredVarianti.filter((v) => (gridQtys[v.codice] || 0) > 0);
    if (toAdd.length === 0) return;
    try {
      await Promise.all(toAdd.map((v) => api.post("/api/carrello", { varianteCodice: v.codice, quantita: gridQtys[v.codice] })));
      notifyCart();
      setGridQtys({});
      setAddBtnText(`${toAdd.length} articoli aggiunti ✓`);
      setTimeout(() => setAddBtnText("Aggiungi al carrello"), 2000);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (galleryModalOpen) {
        if (e.key === "Escape") setGalleryModalOpen(false);
        if (e.key === "ArrowLeft") galleryModalNav(-1);
        if (e.key === "ArrowRight") galleryModalNav(1);
        return;
      }
      if (lightboxOpen) {
        if (e.key === "Escape") setLightboxOpen(false);
        if (e.key === "ArrowRight") lbNav(1);
        if (e.key === "ArrowLeft") lbNav(-1);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [galleryModalOpen, lightboxOpen]);

  if (authLoading || !user || user.userType !== "customer") return <LoadingScreen />;

  return (
    <div className="catalogo-page scheda-prodotto">
      <AreaHeader />
      <main id="content">
        <div className="breadcrumb">
          <Link href="/area/catalogo">Catalogo</Link>
          <span>›</span>
          <Link href={`/area/catalogo?famiglia=${articolo?.famiglia.codice ?? ""}`}>
            {articolo?.famiglia.nome ?? "Caricamento…"}
          </Link>
          <span>›</span>
          {articolo?.nome ?? "…"}
        </div>

        {loading && <div className="container" style={{ paddingBlock: 48, textAlign: "center", color: "var(--muted)" }}>Caricamento…</div>}
        {!loading && !articolo && <div className="container" style={{ paddingBlock: 48, textAlign: "center", color: "var(--muted)" }}>Articolo non trovato.</div>}

        {articolo && (
          <>
            <div className="product-layout">
              <div className="product-left">
                <div className="gallery-wrapper">
                  <div className="gallery-share" title="Condividi">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  </div>
                  <PositionedImage
                    className="gallery-main"
                    src={galleryImages[selectedImgIdx]?.url}
                    css={galleryImages[selectedImgIdx]?.css}
                    aspect={4 / 3}
                    alt={articolo.nome}
                    onClick={() => openLightbox()}
                  >
                    {galleryImages[selectedImgIdx]?.tipo === "AI" && (
                      <span className="ai-badge" title="Immagine generata con AI">AI</span>
                    )}
                  </PositionedImage>
                  <div className="gallery-hint" onClick={() => openLightbox()}>Fai clic per visualizzare la vista completa</div>
                  <div className="gallery-thumbs" id="galleryThumbs">
                    {galleryImages.slice(0, 5).map((img, i) => (
                      <PositionedImage key={img.id} className={`thumb ${i === selectedImgIdx ? "active" : ""}`} src={img.url} css={img.css} aspect={1} alt={`Thumb ${i + 1}`} onClick={() => selectThumb(i)}>
                        {img.tipo === "AI" && <span className="ai-badge ai-badge-sm" title="Immagine generata con AI">AI</span>}
                      </PositionedImage>
                    ))}
                    {galleryImages.length > 5 && (
                      <PositionedImage className="thumb" src={galleryImages[5].url} css={galleryImages[5].css} aspect={1} alt="Altri" onClick={() => openGalleryModal()}>
                        <div className="thumb-more">{galleryImages.length - 5}+</div>
                      </PositionedImage>
                    )}
                  </div>
                </div>
              </div>

              <div className="product-center">
                <div>
                  <p className="eyebrow" style={{ marginBottom: 8 }}>{articolo.famiglia.nome}</p>
                  <h1>{articolo.nome}</h1>
                  {articolo.colore && (
                    <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 8 }}>
                      Colore: <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", background: articolo.coloreRgb || articolo.colore, border: "1px solid var(--border)", verticalAlign: "middle" }} />
                        {articolo.colore}
                      </span>
                    </p>
                  )}
                </div>

                <div className="product-desc-block">
                  <h3>Descrizione</h3>
                  <p>{articolo.descrizione || "Descrizione non disponibile."}</p>
                </div>

                <div className="product-desc-block">
                  <h3>Caratteristiche</h3>
                  <div className="product-features">
                    <div className="feat"><strong>Famiglia:</strong> {articolo.famiglia.nome}</div>
                    <div className="feat"><strong>Varianti:</strong> {articolo.variantiCount}</div>
                    {articolo.colore && <div className="feat"><strong>Colore:</strong> {articolo.colore}</div>}
                    <div className="feat"><strong>Codice:</strong> {articolo.codiceLinea}</div>
                  </div>
                </div>

                {articolo.descrizioneAI && (
                  <div className="product-desc-block">
                    <h3>Punti chiave</h3>
                    <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>
                      {articolo.descrizioneAI.split("\n").filter(Boolean).map((line, i) => (
                        <p key={i} style={{ margin: "0 0 4px" }}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="buy-box">
                {selectedVariant ? (
                  <>
                    <p className="savings-line">Cod. {selectedVariant.codice}</p>
                    {selectedVariant.prezzo && (
                      <>
                        <div className="price-block">
                          <span className="price-net">{formatPrice(selectedVariant.prezzo.prezzoNetto)}</span>
                          {selectedVariant.prezzo.sconto > 0 && <span className="price-list">{formatPrice(selectedVariant.prezzo.prezzoListino)}</span>}
                          {selectedVariant.prezzo.sconto > 0 && <span className="price-discount">−{selectedVariant.prezzo.sconto}%</span>}
                        </div>
                        {selectedVariant.prezzo.sconto > 0 && <p className="savings-line">{`Risparmi ${formatPrice(selectedVariant.prezzo.prezzoListino - selectedVariant.prezzo.prezzoNetto)} (${selectedVariant.prezzo.sconto}%)`}</p>}
                      </>
                    )}
                    <div className="divider" />
                    <div className={`stock-badge ${STOCK_CLASS[getStock(selectedVariant.giacenza)]}`} style={{ fontSize: 14 }}>
                      <span className="stock-dot" /> {STOCK_LABELS[getStock(selectedVariant.giacenza)]}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="savings-line">Cod. {singleVariant?.codice ?? "—"}</p>
                    {(() => {
                      const p = singleVariant?.prezzo;
                      return (
                        <>
                          <div className="price-block">
                            <span className="price-net">{formatPrice(p?.prezzoNetto ?? 0)}</span>
                            {(p?.sconto ?? 0) > 0 && <span className="price-list">{formatPrice(p?.prezzoListino ?? 0)}</span>}
                            {(p?.sconto ?? 0) > 0 && <span className="price-discount">−{p?.sconto ?? 0}%</span>}
                          </div>
                          {(p?.sconto ?? 0) > 0 && <p className="savings-line">{`Risparmi ${formatPrice((p?.prezzoListino ?? 0) - (p?.prezzoNetto ?? 0))} (${p?.sconto ?? 0}%)`}</p>}
                        </>
                      );
                    })()}
                    <div className="divider" />
                    <div className="stock-badge">
                      <span className="stock-dot" /> {singleVariant ? STOCK_LABELS[getStock(singleVariant.giacenza)] : "Seleziona una variante"}
                    </div>
                  </>
                )}

                <div className="divider" />

                {dimKeys.map((key) => {
                  const label = key === "diametro" ? "Diametro" : key === "altezza" ? "Altezza" : key;
                  const prefix = key === "diametro" ? "Ø" : "";
                  const suffix = key === "diametro" || key === "altezza" ? " cm" : "";
                  const available = getAvailableValues(key);
                  return (
                    <div key={key} className="variant-section">
                      <label>{label}</label>
                      <select className="variant-select" value={selDim[key] ?? ""} disabled={!!singleVariant}
                        onChange={(e) => setSelDim((prev) => cascadeSelect(prev, key, e.target.value))}>
                        <option value="">Seleziona {label.toLowerCase()}</option>
                        {available.map((v) => (
                          <option key={v} value={v}>{prefix}{v}{suffix}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}

                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)", display: "block", marginBottom: 8 }}>Quantità</label>
                  <div className="qty-row">
                    <div className="qty-control">
                      <button type="button" onClick={() => changeBuyQty(-qtyStep)} disabled={(!selectedVariant && !singleVariant) || buyOut}>−</button>
                      <input type="number" id="qty" value={buyQty ?? ""} min={qtyStep} step={qtyStep} readOnly
                        onChange={(e) => setBuyQty(Math.max(qtyStep, parseInt(e.target.value) || qtyStep))} />
                      <button type="button" onClick={() => changeBuyQty(qtyStep)} disabled={(!selectedVariant && !singleVariant) || buyOut}>+</button>
                    </div>
                    {selectedVariant?.multiplo && selectedVariant.multiplo > 1 && (
                      <span className="qty-info">Multiplo: {selectedVariant.multiplo} pz</span>
                    )}
                    {singleVariant && singleVariant.multiplo > 1 && !selectedVariant && (
                      <span className="qty-info">Multiplo: {singleVariant.multiplo} pz</span>
                    )}
                  </div>
                </div>

                <button className="btn btn-primary add-to-cart" disabled={(!selectedVariant && !singleVariant) || buyOut}
                  onClick={addSingleToCart}
                  style={{ width: "100%", justifyContent: "center", padding: 12, fontSize: 15, opacity: ((!selectedVariant && !singleVariant) || buyOut) ? 0.5 : 1 }}>
                  {buyOut ? "Esaurito" : buyBtnText}
                </button>
                <button className="btn btn-secondary" disabled={(!selectedVariant && !singleVariant) || buyOut}
                  style={{ width: "100%", justifyContent: "center", padding: 12, fontSize: 15, opacity: ((!selectedVariant && !singleVariant) || buyOut) ? 0.5 : 1 }}>
                  Acquista ora
                </button>

                <div className="divider" />

                <div style={{ fontSize: 13, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0, color: "var(--muted)" }}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    <span>Spedizione entro 48h · Tracciamento completo</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0, color: "var(--muted)" }}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12l2 2 4-4" /></svg>
                    <span>Venduto da Luis S.r.l. · Garanzia 24 mesi</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0, color: "var(--muted)" }}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                    <span>Resi gratuiti entro 30 giorni</span>
                  </div>
                </div>
              </div>
            </div>

            <section className="variant-grid-section">
              <div className="container">
                <h2>Griglia d'ordine varianti</h2>

                <div className="cascade-filters">
                  {dimKeys.map((key) => {
                    const label = key === "diametro" ? "Diametro" : key === "altezza" ? "Altezza" : key;
                    const prefix = key === "diametro" ? "Ø" : "";
                    const suffix = key === "diametro" || key === "altezza" ? " cm" : "";
                    const available = getAvailableValues(key, gridFilter);
                    return (
                      <select key={key} value={gridFilter[key] ?? ""}
                        onChange={(e) => setGridFilter((prev) => cascadeSelect(prev, key, e.target.value))}>
                        <option value="">Tutti {label.toLowerCase()}</option>
                        {available.map((v) => (
                          <option key={v} value={v}>{prefix}{v}{suffix}</option>
                        ))}
                      </select>
                    );
                  })}
                </div>

                <div className="variant-table-scroll">
                <table className="variant-table">
                  <colgroup>
                    <col className="col-cod" />
                    <col className="col-desc" />
                    <col className="col-dim" />
                    <col className="col-stock" />
                    <col className="col-price" />
                    <col className="col-qty" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Cod.</th>
                      <th>Descrizione</th>
                      <th>Dimensioni</th>
                      <th>Disponibilità</th>
                      <th>Prezzo</th>
                      <th>Quantità</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVarianti.map((v) => {
                      const stock = getStock(v.giacenza);
                      const isOut = stock === "out";
                      return (
                        <tr key={v.codice} className={isOut ? "disabled-row" : ""}>
                          <td>
                            <span className="code-cell">
                              {v.codice}
                              {v.descrizione && (
                                <span className="info-trigger">i<span className="tooltip">{v.descrizione}</span></span>
                              )}
                            </span>
                          </td>
                          <td style={{ fontSize: 13, color: "var(--muted)" }}>{v.descrizione || "—"}</td>
                          <td>
                            {dimKeys.map((key) => {
                              const e = v.dimensioni?.[key];
                              if (!e) return "";
                              const prefix = key === "diametro" ? "Ø" : key === "altezza" ? "H" : "";
                              return `${prefix}${e.valore} `;
                            }).join("").trim()}
                          </td>
                          <td>
                            <span className={`stock-badge-sm ${STOCK_CLASS[stock]}`}>
                              <span className="stock-dot" /> {STOCK_LABELS[stock]}
                            </span>
                          </td>
                          <td className="price-cell">
                            {v.prezzo ? (
                              <>
                                <span className="price-net">{formatPrice(v.prezzo.prezzoNetto)} / pz</span>
                                {v.prezzo.sconto > 0 && <span className="price-list">{formatPrice(v.prezzo.prezzoListino)}</span>}
                                {v.prezzo.sconto > 0 && <span className="price-disc">−{v.prezzo.sconto}%</span>}
                              </>
                            ) : (
                              <span className="price-net" style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                            )}
                          </td>
                          <td>
                            <div className="qty-ctrl">
                              <button type="button" disabled={isOut} onClick={() => gridQty(v.codice, -v.multiplo)}>−</button>
                              <input type="number" value={gridQtys[v.codice] || 0} min={0} step={v.multiplo} disabled={isOut} readOnly
                                onChange={(e) => gridQtyDirect(v.codice, parseInt(e.target.value) || 0)} />
                              <button type="button" disabled={isOut} onClick={() => gridQty(v.codice, v.multiplo)}>+</button>
                            </div>
                            {v.multiplo > 1 && <div className="multiplo-info">Multiplo: {v.multiplo} pz</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>

                <div className="variant-grid-footer">
                  <div className="total-info">
                    Righe selezionate: <strong>{gridTotals.count}</strong>
                    <span className="total-sep">·</span>
                    Totale: <strong>{formatPrice(gridTotals.total)}</strong>
                  </div>
                  <button className="btn btn-primary" onClick={addAllToCart}
                    style={addBtnText !== "Aggiungi al carrello" ? { background: "oklch(45% 0.12 145)" } : {}}>
                    {addBtnText}
                  </button>
                </div>
              </div>
            </section>

            <section className="related-section">
              <div className="container">
                <h2>Articoli correlati</h2>
                <div className="related-grid">
                  {[1, 2, 3, 4].map((i) => (
                    <Link key={i} href={`/area/catalogo/${articolo.codiceLinea}`} className="related-card">
                      <PositionedImage className="rel-img" src={galleryImages[0]?.url} css={galleryImages[0]?.css} aspect={4/3} alt="" />
                      <div className="rel-body">
                        <p className="rel-name">{articolo.nome}</p>
                        <span className="rel-price">{formatPrice(10)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <AreaFooter />

      {galleryModalOpen && (
        <div className="gallery-modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setGalleryModalOpen(false); }}>
          <button className="gallery-modal-close" onClick={() => setGalleryModalOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
          </button>
          <div className="gallery-modal-content">
            <div className="gallery-modal-img-area">
              <div className="gallery-modal-img-wrap">
                {/* vista completa: stesso posizionamento (crop 4:3) di card/galleria/editor */}
                <PositionedImage
                  src={allImages[galleryModalIdx]?.url}
                  css={allImages[galleryModalIdx]?.css}
                  aspect={4 / 3}
                  alt=""
                  style={{ width: "100%", maxWidth: 900, borderRadius: 6, cursor: "zoom-in" }}
                  onClick={() => { setGalleryModalOpen(false); openLightbox(galleryModalIdx); }}
                >
                  {allImages[galleryModalIdx]?.tipo === "AI" && (
                    <span className="ai-badge" title="Immagine generata con AI">AI</span>
                  )}
                </PositionedImage>
              </div>
              <div className="gallery-modal-nav">
                <button onClick={() => galleryModalNav(-1)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <span id="galleryModalCounter">{galleryModalIdx + 1} / {allImages.length}</span>
                <button onClick={() => galleryModalNav(1)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            </div>
            <div className="gallery-modal-right">
              <div className="gallery-modal-topbar">
                <h3>{articolo?.nome}</h3>
              </div>
              <div className="gallery-modal-thumbs" id="galleryModalThumbs">
                {allImages.map((img, i) => (
                  <PositionedImage key={img.id} className={`thumb-wrap ${i === galleryModalIdx ? "active" : ""}`} src={img.url} css={img.css} aspect={1} alt={`Thumb ${i + 1}`} onClick={() => setGalleryModalIdx(i)} style={{ width: 52, flexShrink: 0 }}>
                    {img.tipo === "AI" && <span className="ai-badge ai-badge-sm" title="Immagine generata con AI">AI</span>}
                  </PositionedImage>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {lightboxOpen && (
        <div className="lightbox-overlay open" onClick={() => setLightboxOpen(false)}>
          <button className="lightbox-close" onClick={() => setLightboxOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
          <button className="lightbox-nav prev" onClick={(e) => { e.stopPropagation(); lbNav(-1); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          {/* Vista completa: immagine intera, senza ritaglio ma con la rotazione/zoom impostati */}
          {(() => {
            const p = parseImgCss(allImages[lightboxIdx]?.css);
            const t = p.zoom !== 0 || p.rotation !== 0 ? `scale(${1 + p.zoom / 100}) rotate(${p.rotation}deg)` : undefined;
            return <img id="lbImage" src={allImages[lightboxIdx]?.url} alt="Zoom" onClick={(e) => e.stopPropagation()} style={{ transform: t }} />;
          })()}
          <button className="lightbox-nav next" onClick={(e) => { e.stopPropagation(); lbNav(1); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M9 18l6-6-6-6" /></svg>
          </button>
          <div className="lightbox-counter">{lightboxIdx + 1} / {allImages.length}</div>
          {allImages[lightboxIdx]?.tipo === "AI" && (
            <span className="ai-badge ai-badge-lightbox" title="Immagine generata con AI">AI</span>
          )}
        </div>
      )}
    </div>
  );
}
