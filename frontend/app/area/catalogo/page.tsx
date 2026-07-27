"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/use-auth";
import LoadingScreen from "../../../components/common/LoadingScreen";
import AreaHeader from "../../../components/area/AreaHeader";
import AreaFooter from "../../../components/area/AreaFooter";
import AiSearchModal from "../../../components/area/AiSearchModal";
import PositionedImage from "../../../components/common/PositionedImage";

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
  createdAt: string;
}
interface Catalogo {
  articoli: CatalogoArticolo[];
  famiglie: { codice: string; nome: string; count: number }[];
  raccolte: { slug: string; nome: string; count: number }[];
}

const PAGE_SIZE = 12;
const SORT_OPTIONS = [
  { value: "venduti", label: "Ordina: più venduti" },
  { value: "prezzo-asc", label: "Prezzo: basso → alto" },
  { value: "prezzo-desc", label: "Prezzo: alto → basso" },
  { value: "novita", label: "Novità" },
];

const IconStella = (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5l2.47 6.53L21 10.5l-6.53 2.47L12 19.5l-2.47-6.53L3 10.5l6.53-2.47z" /></svg>
);

export default function CatalogoPage() {
  const { user, loading: authLoading } = useAuth("customer");
  const router = useRouter();
  const [facets, setFacets] = useState<{ famiglie: Catalogo["famiglie"]; raccolte: Catalogo["raccolte"] }>({ famiglie: [], raccolte: [] });
  const [articoli, setArticoli] = useState<CatalogoArticolo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [famiglieSel, setFamiglieSel] = useState<Set<string>>(new Set());
  const [raccolteSel, setRaccolteSel] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>("tutti");
  const [sort, setSort] = useState("venduti");
  const [aiOpen, setAiOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Ricerca semantica: risultati dal backend (null = catalogo normale)
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<{ query: string; kind: "text" | "image"; articoli: CatalogoArticolo[] } | null>(null);
  const restored = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

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
    if (activeTab !== "tutti") p.set("tab", activeTab);
    if (search.trim()) p.set("q", search.trim());
    if (sort) p.set("sort", sort);
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
  }, [famiglieSel, raccolteSel, activeTab, search, sort]);

  // Facet (sidebar) — una volta.
  useEffect(() => {
    api.get<{ famiglie: Catalogo["famiglie"]; raccolte: Catalogo["raccolte"] }>("/api/catalogo/facets")
      .then(setFacets).catch(() => setFacets({ famiglie: [], raccolte: [] }));
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
    if (sort !== "venduti") p.set("sort", sort);
    if (search.trim()) p.set("q", search.trim());
    const qs = p.toString();
    router.replace(qs ? `/area/catalogo?${qs}` : "/area/catalogo", { scroll: false });
  }, [aiResults, famiglieSel, raccolteSel, activeTab, sort, search, router]);

  // Al cambio di filtri/ricerca (fuori dalla modalità AI): ricarica dalla pagina 1 (debounce per il testo).
  useEffect(() => {
    if (!restored.current || aiResults) return;
    const t = setTimeout(() => { void fetchPage(1, true); }, 250);
    return () => clearTimeout(t);
  }, [famiglieSel, raccolteSel, activeTab, search, sort, aiResults, fetchPage]);

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
        <h3>Disponibilità</h3>
        {/* Il dato giacenza arriva da Integra in Fase E: per ora tutto Disponibile */}
        <label><input type="checkbox" checked readOnly /> Disponibile <span className="count">{total}</span></label>
        <label><input type="checkbox" readOnly /> Scorte limitate <span className="count">0</span></label>
        <label><input type="checkbox" readOnly /> Esaurito <span className="count">0</span></label>
      </div>
    </>
  );

  return (
    <div className="catalogo-page">
      <AreaHeader>
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input
            type="text"
            placeholder="Cerca articoli, famiglie, raccolte…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="ai-trigger" title="Ricerca intelligente AI" onClick={() => setAiOpen(true)}>
            {IconStella}
          </button>
        </div>
      </AreaHeader>

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

      <AreaFooter />

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
