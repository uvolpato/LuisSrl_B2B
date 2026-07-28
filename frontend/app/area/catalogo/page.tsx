"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/use-auth";
import LoadingScreen from "../../../components/common/LoadingScreen";
import AiSearchModal from "../../../components/area/AiSearchModal";
import PositionedImage from "../../../components/common/PositionedImage";
import { useHeaderCenter } from "../../../contexts/HeaderCenterContext";

interface CatalogoArticolo {
  id: string;
  nome: string;
  colore: string | null;
  coloreRgb: string | null;
  famiglia: { codice: string; nome: string };
  raccolte: { nome: string; slug: string }[];
  img: string | null;
  imgCss: string | null;
  imgTipo: string | null;
  variantiCount: number;
  prezzo: number | null;
  createdAt: string;
}
interface Catalogo {
  articoli: CatalogoArticolo[];
  famiglie: { codice: string; nome: string; count: number }[];
  raccolte: { slug: string; nome: string; count: number }[];
  colori: { nome: string; rgb: string | null; count: number }[];
  dimensioni: Record<string, { min: number; max: number }>;
  prezzo: { min: number; max: number } | null;
}

const PAGE_SIZE = 12;
const SORT_OPTIONS = [
  { value: "novita", label: "Novità" },
  { value: "prezzo-asc", label: "Prezzo: basso → alto" },
  { value: "prezzo-desc", label: "Prezzo: alto → basso" },
  { value: "nome-asc", label: "Nome: A → Z" },
  { value: "nome-desc", label: "Nome: Z → A" },
];

const IconStella = (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5l2.47 6.53L21 10.5l-6.53 2.47L12 19.5l-2.47-6.53L3 10.5l6.53-2.47z" /></svg>
);

export default function CatalogoPage() {
  const { user, loading: authLoading } = useAuth("customer");
  const router = useRouter();
  const [facets, setFacets] = useState<Pick<Catalogo, "famiglie" | "raccolte" | "colori" | "dimensioni" | "prezzo">>({ famiglie: [], raccolte: [], colori: [], dimensioni: {}, prezzo: null });
  const [articoli, setArticoli] = useState<CatalogoArticolo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [famiglieSel, setFamiglieSel] = useState<Set<string>>(new Set());
  const [raccolteSel, setRaccolteSel] = useState<Set<string>>(new Set());
  const [coloreRgb, setColoreRgb] = useState<string>("");
  const [coloreTolleranza, setColoreTolleranza] = useState<number>(15);
  const [diametroRange, setDiametroRange] = useState<[number, number]>([0, 999]);
  const [altezzaRange, setAltezzaRange] = useState<[number, number]>([0, 999]);
  const [prezzoRange, setPrezzoRange] = useState<[number, number]>([0, 9999]);
  const [activeTab, setActiveTab] = useState<string>("tutti");
  const [sort, setSort] = useState("novita");
  const [aiOpen, setAiOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Ricerca semantica: risultati dal backend (null = catalogo normale)
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<{ query: string; kind: "text" | "image"; articoli: CatalogoArticolo[] } | null>(null);
  const restored = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { setContent: setHeaderCenter } = useHeaderCenter();

  useEffect(() => {
    setHeaderCenter(
      <div className="search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
        <input
          type="text"
          placeholder="Cerca articoli, famiglie, raccolte…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={search ? { paddingRight: 68 } : undefined}
        />
        {search && (
          <button type="button" onClick={() => setSearch("")} aria-label="Cancella" title="Cancella"
            style={{ position: "absolute", right: 42, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4, display: "grid", placeItems: "center", zIndex: 2 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        )}
        <button className="ai-trigger" title="Ricerca intelligente AI" aria-label="Ricerca intelligente AI" onClick={() => setAiOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z" /></svg>
        </button>
      </div>
    );
    return () => setHeaderCenter(null);
  }, [search, setHeaderCenter]);

  const runAiSearch = useCallback(async (queryArg?: string) => {
    const q = (queryArg ?? aiQuery).trim();
    if (!q) return;
    setAiQuery(q);
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await api.post<{ articoli: CatalogoArticolo[]; error?: string }>("/api/catalogo/ricerca", { q });
      if (res.error) { setAiError("La ricerca intelligente non è al momento disponibile."); return; }
      setAiResults({ query: q, kind: "text", articoli: res.articoli });
      setAiOpen(false);
    } catch {
      setAiError("Ricerca non riuscita. Riprova.");
    } finally {
      setAiLoading(false);
    }
  }, [aiQuery]);

  const runImageSearch = useCallback(async (file: File) => {
    setAiLoading(true);
    setAiError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<{ articoli: CatalogoArticolo[]; error?: string }>("/api/catalogo/ricerca-immagine", fd);
      if (res.error) {
        setAiError(res.error === "immagine_non_pertinente" || res.error === "immagine_non_riconosciuta"
          ? "Non ho riconosciuto un prodotto nell'immagine. Prova con un'altra foto."
          : "Ricerca non riuscita. Riprova.");
        return;
      }
      setAiResults({ query: "immagine caricata", kind: "image", articoli: res.articoli });
      setAiOpen(false);
    } catch {
      setAiError("Ricerca non riuscita. Riprova.");
    } finally {
      setAiLoading(false);
    }
  }, []);

  // Carica una pagina della lista dal server e la accoda (o sostituisce, se reset).
  const fetchPage = useCallback(async (pageN: number, reset: boolean) => {
    setListLoading(true);
    const p = new URLSearchParams();
    p.set("page", String(pageN));
    p.set("pageSize", String(PAGE_SIZE));
    if (famiglieSel.size) p.set("famiglia", [...famiglieSel].join(","));
    if (raccolteSel.size) p.set("raccolte", [...raccolteSel].join(","));
    if (coloreRgb) { p.set("coloreRgb", coloreRgb); p.set("coloreTolleranza", String(coloreTolleranza)); }
    if (activeTab !== "tutti") p.set("tab", activeTab);
    if (search.trim()) p.set("q", search.trim());
    if (sort) p.set("sort", sort);
    if (facets.dimensioni.diametro && diametroRange[0] > facets.dimensioni.diametro.min) p.set("diametroMin", String(diametroRange[0]));
    if (facets.dimensioni.diametro && diametroRange[1] < facets.dimensioni.diametro.max) p.set("diametroMax", String(diametroRange[1]));
    if (facets.dimensioni.altezza && altezzaRange[0] > facets.dimensioni.altezza.min) p.set("altezzaMin", String(altezzaRange[0]));
    if (facets.dimensioni.altezza && altezzaRange[1] < facets.dimensioni.altezza.max) p.set("altezzaMax", String(altezzaRange[1]));
    if (facets.prezzo && prezzoRange[0] > facets.prezzo.min) p.set("prezzoMin", String(prezzoRange[0]));
    if (facets.prezzo && prezzoRange[1] < facets.prezzo.max) p.set("prezzoMax", String(prezzoRange[1]));
    try {
      const res = await api.get<{ articoli: CatalogoArticolo[]; total: number; hasMore: boolean }>(`/api/catalogo?${p.toString()}`);
      setTotal(res.total);
      setHasMore(res.hasMore);
      setArticoli((prev) => (reset ? res.articoli : [...prev, ...res.articoli]));
      setPage(pageN);
    } catch {
      if (reset) { setArticoli([]); setTotal(0); setHasMore(false); }
    } finally {
      setListLoading(false);
    }
  }, [famiglieSel, raccolteSel, coloreRgb, coloreTolleranza, activeTab, search, sort, diametroRange, altezzaRange, prezzoRange, facets]);

  // Facet (sidebar) — una volta.
  useEffect(() => {
    api.get<Catalogo>("/api/catalogo/facets")
      .then((data) => {
        setFacets({ famiglie: data.famiglie ?? [], raccolte: data.raccolte ?? [], colori: data.colori ?? [], dimensioni: data.dimensioni ?? {}, prezzo: data.prezzo ?? null });
        if (data.dimensioni?.diametro) setDiametroRange([data.dimensioni.diametro.min, data.dimensioni.diametro.max]);
        if (data.dimensioni?.altezza) setAltezzaRange([data.dimensioni.altezza.min, data.dimensioni.altezza.max]);
        if (data.prezzo) setPrezzoRange([data.prezzo.min, data.prezzo.max]);
      })
      .catch(() => setFacets({ famiglie: [], raccolte: [], colori: [], dimensioni: {}, prezzo: null }));
  }, []);

  // Ripristina lo stato dall'URL: deep-link da /area/famiglie (?famiglia=),
  // ritorno da un prodotto o "torna indietro" del browser (l'URL è la fonte di verità).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const fam = p.get("famiglia"); if (fam) setFamiglieSel(new Set(fam.split(",").filter(Boolean)));
    const rac = p.get("raccolte"); if (rac) setRaccolteSel(new Set(rac.split(",").filter(Boolean)));
    const tab = p.get("tab"); if (tab) setActiveTab(tab);
    const so = p.get("sort"); if (so) setSort(so);
    const q = p.get("q"); if (q) setSearch(q);
    const ai = p.get("ai"); if (ai) { setAiQuery(ai); void runAiSearch(ai); }
    // Ricerca per immagine avviata dalla dashboard: risultati passati via sessionStorage.
    if (p.get("imgsearch")) {
      const raw = sessionStorage.getItem("ai-image-results");
      if (raw) {
        try { setAiResults({ query: "immagine caricata", kind: "image", articoli: JSON.parse(raw) }); } catch { /* ignora */ }
        sessionStorage.removeItem("ai-image-results");
      }
    }
    restored.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mantiene l'URL allineato allo stato (filtri + ricerca AI testuale).
  useEffect(() => {
    if (!restored.current) return;
    const p = new URLSearchParams();
    if (aiResults?.kind === "text") p.set("ai", aiResults.query);
    if (famiglieSel.size) p.set("famiglia", [...famiglieSel].join(","));
    if (raccolteSel.size) p.set("raccolte", [...raccolteSel].join(","));
    if (activeTab !== "tutti") p.set("tab", activeTab);
    if (sort !== "novita") p.set("sort", sort);
    if (search.trim()) p.set("q", search.trim());
    const qs = p.toString();
    router.replace(qs ? `/area/catalogo?${qs}` : "/area/catalogo", { scroll: false });
  }, [aiResults, famiglieSel, raccolteSel, activeTab, sort, search, router]);

  // Al cambio di filtri/ricerca (fuori dalla modalità AI): ricarica dalla pagina 1 (debounce per il testo).
  useEffect(() => {
    if (!restored.current || aiResults) return;
    const t = setTimeout(() => { void fetchPage(1, true); }, 250);
    return () => clearTimeout(t);
  }, [famiglieSel, raccolteSel, coloreRgb, coloreTolleranza, activeTab, search, sort, diametroRange, altezzaRange, prezzoRange, aiResults, fetchPage]);

  // Infinite scroll: carica la pagina successiva quando il sentinella entra in viewport.
  useEffect(() => {
    if (aiResults) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !listLoading) void fetchPage(page + 1, false);
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, listLoading, page, aiResults, fetchPage]);

  // Lista mostrata: risultati AI (top-k) oppure catalogo paginato accumulato.
  const displayed = aiResults ? aiResults.articoli : articoli;
  const tabLabel = activeTab !== "tutti" ? facets.raccolte.find((r) => r.slug === activeTab)?.nome : null;

  function toggleSet(set: Set<string>, val: string, setter: (s: Set<string>) => void) {
    const n = new Set(set);
    if (n.has(val)) n.delete(val); else n.add(val);
    setter(n);
  }

  function rangePerc(val: [number, number], min: number, max: number) {
    if (max <= min) return { left: "0%", right: "0%" };
    const l = ((val[0] - min) / (max - min)) * 100;
    const r = ((max - val[1]) / (max - min)) * 100;
    return { left: `${l}%`, right: `${r}%` };
  }

  if (authLoading || !user || user.userType !== "customer") return <LoadingScreen />;

  // Contenuto filtri: reso sia nella sidebar (desktop) sia nel pannello (mobile)
  const filtersContent = (
    <>
      <div className="filter-group">
        <h3>Famiglia</h3>
        {facets.famiglie.map((f) => (
          <label key={f.codice}>
            <input type="checkbox" checked={famiglieSel.has(f.codice)} onChange={() => toggleSet(famiglieSel, f.codice, setFamiglieSel)} />
            {f.nome} <span className="count">{f.count}</span>
          </label>
        ))}
        {facets.famiglie.length === 0 && <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Nessuna famiglia</p>}
      </div>
      <hr className="filter-divider" />
      <div className="filter-group">
        <h3>Raccolte</h3>
        {facets.raccolte.map((r) => (
          <label key={r.slug}>
            <input type="checkbox" checked={raccolteSel.has(r.slug)} onChange={() => toggleSet(raccolteSel, r.slug, setRaccolteSel)} />
            {r.nome} <span className="count">{r.count}</span>
          </label>
        ))}
        {facets.raccolte.length === 0 && <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Nessuna raccolta</p>}
      </div>
      <hr className="filter-divider" />
      <div className="filter-group">
        <h3>Cerca per colore</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="color" value={coloreRgb || "#808080"} onChange={(e) => setColoreRgb(e.target.value)} style={{ width: 32, height: 32, padding: 0, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer" }} />
          {coloreRgb && <button onClick={() => setColoreRgb("")} style={{ fontSize: 12, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>✕</button>}
        </div>
        {coloreRgb && (
          <>
            <div className="dual-range" style={{ marginTop: 8 }}>
              <span className="dual-range-val">{coloreTolleranza}</span>
              <div className="dual-range-track" style={{ "--range-left": "0%", "--range-right": `${100 - (coloreTolleranza / 100) * 100}%` } as React.CSSProperties}>
                <input type="range" min={1} max={100} step={1} value={coloreTolleranza} onChange={(e) => setColoreTolleranza(Number(e.target.value))} className="dual-range-input dual-range-min" />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)" }}>
              <span>Preciso</span><span>Esteso</span>
            </div>
          </>
        )}
      </div>
      <hr className="filter-divider" />
      {Object.keys(facets.dimensioni).length > 0 && (
        <>
          {facets.dimensioni.diametro && (
            <>
              <div className="filter-group">
                <h3>Diametro (cm)</h3>
                <div className="dual-range">
                  <span className="dual-range-val">{diametroRange[0]}</span>
                  <div className="dual-range-track" style={{ "--range-left": rangePerc(diametroRange, facets.dimensioni.diametro.min, facets.dimensioni.diametro.max).left, "--range-right": rangePerc(diametroRange, facets.dimensioni.diametro.min, facets.dimensioni.diametro.max).right } as React.CSSProperties}>
                    <input type="range" min={facets.dimensioni.diametro.min} max={facets.dimensioni.diametro.max} step={1} value={diametroRange[0]} onChange={(e) => { const v = Number(e.target.value); if (v <= diametroRange[1]) setDiametroRange([v, diametroRange[1]]); }} className="dual-range-input dual-range-min" />
                    <input type="range" min={facets.dimensioni.diametro.min} max={facets.dimensioni.diametro.max} step={1} value={diametroRange[1]} onChange={(e) => { const v = Number(e.target.value); if (v >= diametroRange[0]) setDiametroRange([diametroRange[0], v]); }} className="dual-range-input dual-range-max" />
                  </div>
                  <span className="dual-range-val">{diametroRange[1]}</span>
                </div>
              </div>
              <hr className="filter-divider" />
            </>
          )}
          {facets.dimensioni.altezza && (
            <>
              <div className="filter-group">
                <h3>Altezza (cm)</h3>
                <div className="dual-range">
                  <span className="dual-range-val">{altezzaRange[0]}</span>
                  <div className="dual-range-track" style={{ "--range-left": rangePerc(altezzaRange, facets.dimensioni.altezza.min, facets.dimensioni.altezza.max).left, "--range-right": rangePerc(altezzaRange, facets.dimensioni.altezza.min, facets.dimensioni.altezza.max).right } as React.CSSProperties}>
                    <input type="range" min={facets.dimensioni.altezza.min} max={facets.dimensioni.altezza.max} step={1} value={altezzaRange[0]} onChange={(e) => { const v = Number(e.target.value); if (v <= altezzaRange[1]) setAltezzaRange([v, altezzaRange[1]]); }} className="dual-range-input dual-range-min" />
                    <input type="range" min={facets.dimensioni.altezza.min} max={facets.dimensioni.altezza.max} step={1} value={altezzaRange[1]} onChange={(e) => { const v = Number(e.target.value); if (v >= altezzaRange[0]) setAltezzaRange([altezzaRange[0], v]); }} className="dual-range-input dual-range-max" />
                  </div>
                  <span className="dual-range-val">{altezzaRange[1]}</span>
                </div>
              </div>
              <hr className="filter-divider" />
            </>
          )}
        </>
      )}
      {facets.prezzo && (
        <div className="filter-group">
          <h3>Prezzo (€)</h3>
          <div className="dual-range">
            <span className="dual-range-val">{prezzoRange[0]}</span>
            <div className="dual-range-track" style={{ "--range-left": rangePerc(prezzoRange, facets.prezzo.min, facets.prezzo.max).left, "--range-right": rangePerc(prezzoRange, facets.prezzo.min, facets.prezzo.max).right } as React.CSSProperties}>
              <input type="range" min={facets.prezzo.min} max={facets.prezzo.max} step={1} value={prezzoRange[0]} onChange={(e) => { const v = Number(e.target.value); if (v <= prezzoRange[1]) setPrezzoRange([v, prezzoRange[1]]); }} className="dual-range-input dual-range-min" />
              <input type="range" min={facets.prezzo.min} max={facets.prezzo.max} step={1} value={prezzoRange[1]} onChange={(e) => { const v = Number(e.target.value); if (v >= prezzoRange[0]) setPrezzoRange([prezzoRange[0], v]); }} className="dual-range-input dual-range-max" />
            </div>
            <span className="dual-range-val">{prezzoRange[1]}</span>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="catalogo-page">
      <main>
        <div className="container">
          <div className="catalog-layout">
            <aside className="sidebar">
              {filtersContent}
            </aside>

            <div>
              <div className="catalog-header">
                <div>
                  <h2>{aiResults ? "Ricerca intelligente" : (tabLabel ?? "Catalogo")}</h2>
                  <p className="meta">{aiResults ? displayed.length : total} articoli{tabLabel && !aiResults ? " · Raccolta" : ""} · Prezzi IVA esclusa</p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button type="button" className="filters-toggle" onClick={() => setFiltersOpen(true)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="4" y1="6" x2="20" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/></svg>
                    Filtri
                  </button>
                  <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="raccolte-bar">
                <button className={`raccolte-tab ${activeTab === "tutti" ? "active" : ""}`} onClick={() => setActiveTab("tutti")}>Tutti</button>
                {facets.raccolte.map((r) => (
                  <button key={r.slug} className={`raccolte-tab ${activeTab === r.slug ? "active" : ""}`} onClick={() => setActiveTab(r.slug)}>
                    {r.nome}
                  </button>
                ))}
              </div>

              {aiResults && (
                <div className="ai-results-banner" style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 16px", padding: "10px 14px", background: "var(--accent-soft)", borderRadius: 8, fontSize: 14 }}>
                  <span style={{ color: "var(--accent)", width: 18, height: 18, display: "inline-flex" }}>{IconStella}</span>
                  {aiResults.kind === "image"
                    ? <>Risultati per <strong>immagine caricata</strong></>
                    : <>Risultati per <strong>«{aiResults.query}»</strong></>}
                  <button type="button" className="btn btn-ghost" style={{ marginLeft: "auto", padding: "4px 10px" }} onClick={() => { setAiResults(null); setAiQuery(""); }}>
                    Torna al catalogo
                  </button>
                </div>
              )}

              <div className="product-grid">
                {displayed.map((a) => (
                  <Link href={`/area/catalogo/${a.id}`} key={a.id} className="product-card">
                    <PositionedImage className="product-img" src={a.img} css={a.imgCss} aspect={4 / 3} alt={a.nome} thumbWidth={400}>
                      {a.imgTipo === "AI" && <span className="ai-badge" title="Immagine generata con AI">AI</span>}
                    </PositionedImage>
                    <div className="product-body">
                      <div className="product-famiglia">
                        <span className="color-dot" style={{ background: a.coloreRgb || a.colore || "var(--fg-soft)" }} />
                        {a.famiglia.nome}
                      </div>
                      <p className="product-name">{a.nome}</p>
                      {a.raccolte.length > 0 && (
                        <div className="product-tags">
                          {a.raccolte.map((r) => <span key={r.slug} className="product-tag">{r.nome}</span>)}
                        </div>
                      )}
                      <div className="product-meta">
                        {a.prezzo != null && (
                          <span className="product-price">{a.variantiCount > 1 ? `da ` : ''}{a.prezzo.toFixed(2)}&nbsp;&euro;</span>
                        )}
                        <span className="product-variants">{a.variantiCount} varianti</span>
                        <span className="product-stock stock-ok">Disponibile</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {listLoading && displayed.length === 0 && <div className="catalog-empty">Caricamento…</div>}
              {!listLoading && displayed.length === 0 && (
                <div className="catalog-empty">Nessun articolo trovato. Prova a modificare filtri o ricerca.</div>
              )}

              {/* Infinite scroll: sentinella + indicatore (solo catalogo, non in modalità AI) */}
              {!aiResults && (
                <>
                  <div ref={sentinelRef} style={{ height: 1 }} />
                  {listLoading && displayed.length > 0 && (
                    <div className="catalog-empty" style={{ padding: "16px 0" }}>Carico altri articoli…</div>
                  )}
                  {!hasMore && displayed.length > 0 && (
                    <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, margin: "16px 0" }}>
                      Hai visto tutti i {total} articoli.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── Pannello filtri mobile (la sidebar è nascosta sotto i 920px) ── */}
      <div className={`filters-drawer-overlay ${filtersOpen ? "open" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setFiltersOpen(false); }}>
        <aside className={`filters-drawer ${filtersOpen ? "open" : ""}`}>
          <div className="filters-drawer-head">
            <h3>Filtri</h3>
            <button className="filters-drawer-close" onClick={() => setFiltersOpen(false)} aria-label="Chiudi">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="filters-drawer-body">
            {filtersContent}
          </div>
          <div className="filters-drawer-foot">
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setFiltersOpen(false)}>
              Mostra {total} articoli
            </button>
          </div>
        </aside>
      </div>

      <AiSearchModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onSubmit={(q) => runAiSearch(q)}
        onSubmitImage={(f) => runImageSearch(f)}
        loading={aiLoading}
        error={aiError}
        initialQuery={aiQuery}
      />
    </div>
  );
}
