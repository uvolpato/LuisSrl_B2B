"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../../lib/use-auth";
import LoadingScreen from "../../../../components/common/LoadingScreen";
import AreaHeader from "../../../../components/area/AreaHeader";
import { imgStyle } from "../../../../lib/img-css";
import PositionedImage from "../../../../components/common/PositionedImage";
import "../../catalogo.css";

interface Variante {
  codice: string;
  descrizione: string;
  dimensioni: Record<string, string> | null;
  multiplo: number;
  giacenza: number;
  stato: string;
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
      .then((r) => r.json())
      .then((d) => { setArticolo(d); setLoading(false); })
      .catch(() => { setLoading(false); });
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
  const [dim1, setDim1] = useState("");
  const [dim2, setDim2] = useState("");
  const [buyQty, setBuyQty] = useState(6);
  const [filterDim1, setFilterDim1] = useState("");
  const [filterDim2, setFilterDim2] = useState("");
  const [gridQtys, setGridQtys] = useState<Record<string, number>>({});
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [galleryModalIdx, setGalleryModalIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [addBtnText, setAddBtnText] = useState("Aggiungi al carrello");

  const dim1Ref = useRef<HTMLSelectElement>(null);
  const dim2Ref = useRef<HTMLSelectElement>(null);

  const varianti = useMemo(() => {
    if (!articolo) return [];
    return articolo.varianti.filter((v) => v.stato === "attivo");
  }, [articolo]);

  const dim1Values = useMemo(() => {
    const s = new Set<string>();
    varianti.forEach((v) => {
      if (v.dimensioni && v.dimensioni["dim1"]) s.add(v.dimensioni["dim1"]);
    });
    return [...s].sort();
  }, [varianti]);

  const dim2Map = useMemo(() => {
    const map: Record<string, string[]> = { "": [] };
    const all = new Set<string>();
    varianti.forEach((v) => {
      const d1 = v.dimensioni?.["dim1"] ?? "";
      const d2 = v.dimensioni?.["dim2"] ?? "";
      if (d2) all.add(d2);
      if (!d1) return;
      if (!map[d1]) map[d1] = [];
      if (d2 && !map[d1].includes(d2)) map[d1].push(d2);
    });
    map[""] = [...all];
    return map;
  }, [varianti]);

  const dim2Values = useMemo(() => {
    return (dim2Map[dim1] || dim2Map[""] || []).sort();
  }, [dim1, dim2Map]);

  const filterDim2Values = useMemo(() => {
    return (dim2Map[filterDim1] || dim2Map[""] || []).sort();
  }, [filterDim1, dim2Map]);

  const selectedVariant = useMemo(() => {
    if (!dim1 || !dim2) return null;
    return varianti.find((v) => v.dimensioni?.["dim1"] === dim1 && v.dimensioni?.["dim2"] === dim2) || null;
  }, [varianti, dim1, dim2]);

  const filteredVarianti = useMemo(() => {
    return varianti.filter((v) => {
      const m1 = !filterDim1 || v.dimensioni?.["dim1"] === filterDim1;
      const m2 = !filterDim2 || v.dimensioni?.["dim2"] === filterDim2;
      return m1 && m2;
    });
  }, [varianti, filterDim1, filterDim2]);

  const gridTotals = useMemo(() => {
    let count = 0, total = 0;
    filteredVarianti.forEach((v) => {
      const qty = gridQtys[v.codice] || 0;
      if (qty > 0) {
        count++;
        total += qty * 10;
      }
    });
    return { count, total };
  }, [filteredVarianti, gridQtys]);

  function handleDim1Change(val: string) {
    setDim1(val);
    const allowed = dim2Map[val] || dim2Map[""] || [];
    if (dim2 && !allowed.includes(dim2)) setDim2("");
  }

  function handleFilterDim1Change(val: string) {
    setFilterDim1(val);
    const allowed = dim2Map[val] || dim2Map[""] || [];
    if (filterDim2 && !allowed.includes(filterDim2)) setFilterDim2("");
  }

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

  function addAllToCart() {
    const added = filteredVarianti.filter((v) => (gridQtys[v.codice] || 0) > 0).length;
    if (added > 0) {
      setGridQtys({});
      setAddBtnText(`${added} articoli aggiunti ✓`);
      setTimeout(() => setAddBtnText("Aggiungi al carrello"), 2000);
    }
  }

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

  const qtyStep = selectedVariant?.multiplo || 6;

  function changeBuyQty(delta: number) {
    setBuyQty((prev) => {
      const step = selectedVariant?.multiplo || 6;
      const next = Math.max(step, Math.round((prev + delta) / step) * step);
      return next;
    });
  }

  useEffect(() => {
    if (selectedVariant) {
      setBuyQty(selectedVariant.multiplo);
    }
  }, [selectedVariant]);

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
                  />
                  <div className="gallery-hint" onClick={() => openLightbox()}>Fai clic per visualizzare la vista completa</div>
                  <div className="gallery-thumbs" id="galleryThumbs">
                    {galleryImages.slice(0, 5).map((img, i) => (
                      <div key={img.id} className={`thumb ${i === selectedImgIdx ? "active" : ""}`} onClick={() => selectThumb(i)}>
                        <img src={img.url} alt={`Thumb ${i + 1}`} style={imgStyle(img.css)} />
                      </div>
                    ))}
                    {galleryImages.length > 5 && (
                      <div className="thumb" style={{ position: "relative" }} onClick={() => openGalleryModal()}>
                        <img src={galleryImages[5].url} alt={`Thumb 6`} style={imgStyle(galleryImages[5].css)} />
                        <div className="thumb-more">{galleryImages.length - 5}+</div>
                      </div>
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

                {articolo.descrizioneDettagliata && (
                  <div className="product-desc-block">
                    <h3>Punti chiave</h3>
                    <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>
                      {articolo.descrizioneDettagliata.split("\n").filter(Boolean).map((line, i) => (
                        <p key={i} style={{ margin: "0 0 4px" }}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="buy-box">
                {selectedVariant ? (
                  <>
                    <div className="price-block">
                      <span className="price-net">{formatPrice(10)}</span>
                      <span className="price-list">{formatPrice(12.5)}</span>
                      <span className="price-discount">−20%</span>
                    </div>
                    <p className="savings-line">Risparmi {formatPrice(2.5)} (20%)</p>
                    <div className="divider" />
                    <div className={`stock-badge ${STOCK_CLASS[getStock(selectedVariant.giacenza)]}`} style={{ fontSize: 14 }}>
                      <span className="stock-dot" /> {STOCK_LABELS[getStock(selectedVariant.giacenza)]}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="price-block">
                      <span className="price-net">—</span>
                    </div>
                    <div className="divider" />
                    <div className="stock-badge">
                      <span className="stock-dot" /> Seleziona una variante
                    </div>
                  </>
                )}

                <div className="divider" />

                <div className="variant-section">
                  <label>Altezza</label>
                  <select className="variant-select" id="dim1" value={dim1} onChange={(e) => handleDim1Change(e.target.value)} ref={dim1Ref}>
                    <option value="">Seleziona altezza</option>
                    {dim1Values.map((v) => (
                      <option key={v} value={v}>{v} cm</option>
                    ))}
                  </select>
                </div>

                <div className="variant-section">
                  <label>Diametro</label>
                  <select className="variant-select" id="dim2" value={dim2} onChange={(e) => setDim2(e.target.value)} ref={dim2Ref}>
                    <option value="">Seleziona diametro</option>
                    {dim2Values.map((v) => (
                      <option key={v} value={v}>Ø{v} cm</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)", display: "block", marginBottom: 8 }}>Quantità</label>
                  <div className="qty-row">
                    <div className="qty-control">
                      <button type="button" onClick={() => changeBuyQty(-qtyStep)}>−</button>
                      <input type="number" id="qty" value={buyQty} min={qtyStep} step={qtyStep}
                        onChange={(e) => setBuyQty(Math.max(qtyStep, parseInt(e.target.value) || qtyStep))} />
                      <button type="button" onClick={() => changeBuyQty(qtyStep)}>+</button>
                    </div>
                    <span className="qty-info">Multiplo: {qtyStep} pz</span>
                  </div>
                </div>

                <button className="btn btn-primary add-to-cart" disabled={!selectedVariant}
                  style={{ width: "100%", justifyContent: "center", padding: 12, fontSize: 15, opacity: selectedVariant ? 1 : 0.5 }}>
                  Aggiungi al carrello
                </button>
                <button className="btn btn-secondary" disabled={!selectedVariant}
                  style={{ width: "100%", justifyContent: "center", padding: 12, fontSize: 15, opacity: selectedVariant ? 1 : 0.5 }}>
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
                  <select id="filterDim1" value={filterDim1} onChange={(e) => handleFilterDim1Change(e.target.value)}>
                    <option value="">Tutte le altezze</option>
                    {dim1Values.map((v) => (
                      <option key={v} value={v}>{v} cm</option>
                    ))}
                  </select>
                  <select id="filterDim2" value={filterDim2} onChange={(e) => setFilterDim2(e.target.value)}>
                    <option value="">Tutti i diametri</option>
                    {filterDim2Values.map((v) => (
                      <option key={v} value={v}>Ø{v} cm</option>
                    ))}
                  </select>
                </div>

                <table className="variant-table">
                  <thead>
                    <tr>
                      <th>Dimensioni</th>
                      <th>Cod. Integra</th>
                      <th>Prezzo</th>
                      <th>Disponibilità</th>
                      <th>Quantità</th>
                    </tr>
                  </thead>
                  <tbody id="variantBody">
                    {filteredVarianti.map((v) => {
                      const stock = getStock(v.giacenza);
                      const isOut = stock === "out";
                      return (
                        <tr key={v.codice} data-codice={v.codice} className={isOut ? "disabled-row" : ""}>
                          <td>
                            {v.dimensioni?.["dim2"] ? `Ø${v.dimensioni["dim2"]} ` : ""}
                            {v.dimensioni?.["dim1"] ? `H${v.dimensioni["dim1"]}` : ""}
                          </td>
                          <td>
                            <span className="code-cell">
                              {v.codice}
                              {v.descrizione && (
                                <span className="info-trigger">i<span className="tooltip">{v.descrizione}</span></span>
                              )}
                            </span>
                          </td>
                          <td>
                            <div className="price-cell">
                              <span className="price-net">{formatPrice(10)}</span>
                              <span className="price-list">{formatPrice(12.5)}</span>
                              <span className="price-disc">−20%</span>
                            </div>
                          </td>
                          <td>
                            <span className={`stock-badge-sm ${STOCK_CLASS[stock]}`}>
                              <span className="stock-dot" /> {STOCK_LABELS[stock]}
                            </span>
                          </td>
                          <td>
                            <div className="qty-ctrl">
                              <button type="button" disabled={isOut} onClick={() => gridQty(v.codice, -v.multiplo)}>−</button>
                              <input type="number" value={gridQtys[v.codice] || 0} min={0} step={v.multiplo} disabled={isOut}
                                onChange={(e) => gridQtyDirect(v.codice, parseInt(e.target.value) || 0)} />
                              <button type="button" disabled={isOut} onClick={() => gridQty(v.codice, v.multiplo)}>+</button>
                            </div>
                            <div className="multiplo-info">Multiplo: {v.multiplo} pz</div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredVarianti.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>Nessuna variante trovata</td></tr>
                    )}
                  </tbody>
                </table>

                <div className="variant-grid-footer">
                  <div className="total-info">
                    Righe selezionate: <strong id="gridRowCount">{gridTotals.count}</strong> · Totale: <strong id="gridTotal">{formatPrice(gridTotals.total)}</strong>
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
                      <div className="rel-img">
                        {galleryImages[0] ? <img src={galleryImages[0].url} alt="" style={imgStyle(galleryImages[0].css)} /> : null}
                      </div>
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

      <footer className="pagefoot">
        <div className="container row-between">
          <span>© 2026 Luis S.r.l. · Via F. Bellafino 28/30, Bergamo</span>
          <span className="meta">info@luisbg.it · +39 035 0521957</span>
          <span className="meta">Realizzato da <strong>Ugo Volpato</strong> AI Consultant</span>
        </div>
      </footer>

      {galleryModalOpen && (
        <div className="gallery-modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setGalleryModalOpen(false); }}>
          <button className="gallery-modal-close" onClick={() => setGalleryModalOpen(false)}>×</button>
          <div className="gallery-modal-content">
            <div className="gallery-modal-img-area">
              <div className="gallery-modal-img-wrap">
                <img id="galleryModalImg" src={allImages[galleryModalIdx]?.url} alt=""
                  style={imgStyle(allImages[galleryModalIdx]?.css ?? "")}
                  onClick={() => { setGalleryModalOpen(false); openLightbox(galleryModalIdx); }} />
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
                  <img key={img.id} src={img.url} className={i === galleryModalIdx ? "active" : ""}
                    onClick={() => setGalleryModalIdx(i)} alt={`Thumb ${i + 1}`} style={imgStyle(img.css)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {lightboxOpen && (
        <div className="lightbox-overlay open" onClick={() => setLightboxOpen(false)}>
          <button className="lightbox-close" onClick={() => setLightboxOpen(false)}>×</button>
          <button className="lightbox-nav prev" onClick={(e) => { e.stopPropagation(); lbNav(-1); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          {/* Vista completa: immagine intera, senza il ritaglio/posizionamento della galleria */}
          <img id="lbImage" src={allImages[lightboxIdx]?.url} alt="Zoom" onClick={(e) => e.stopPropagation()} />
          <button className="lightbox-nav next" onClick={(e) => { e.stopPropagation(); lbNav(1); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M9 18l6-6-6-6" /></svg>
          </button>
          <div className="lightbox-counter">{lightboxIdx + 1} / {allImages.length}</div>
        </div>
      )}
    </div>
  );
}
