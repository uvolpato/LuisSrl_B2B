"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/use-auth";
import LoadingScreen from "../../../components/common/LoadingScreen";
import AreaHeader from "../../../components/area/AreaHeader";
import AreaFooter from "../../../components/area/AreaFooter";
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
  const [data, setData] = useState<Catalogo | null>(null);
  const [search, setSearch] = useState("");
  const [famiglieSel, setFamiglieSel] = useState<Set<string>>(new Set());
  const [raccolteSel, setRaccolteSel] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>("tutti");
  const [sort, setSort] = useState("venduti");
  const [page, setPage] = useState(1);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiNotice, setAiNotice] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const aiInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<Catalogo>("/api/catalogo").then(setData).catch(() => setData({ articoli: [], famiglie: [], raccolte: [] }));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.articoli;
    if (famiglieSel.size > 0) list = list.filter((a) => famiglieSel.has(a.famiglia.codice));
    if (activeTab !== "tutti") list = list.filter((a) => a.raccolte.some((r) => r.slug === activeTab));
    if (raccolteSel.size > 0) list = list.filter((a) => a.raccolte.some((r) => raccolteSel.has(r.slug)));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) =>
        a.nome.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        a.famiglia.nome.toLowerCase().includes(q) ||
        a.raccolte.some((r) => r.nome.toLowerCase().includes(q)),
      );
    }
    if (sort === "novita") {
      list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    // "venduti" e "prezzo-*" ordinano davvero quando arriveranno ordini (Fase D) e listini (Fase C)
    return list;
  }, [data, famiglieSel, raccolteSel, activeTab, search, sort]);

  useEffect(() => { setPage(1); }, [famiglieSel, raccolteSel, activeTab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const tabLabel = activeTab !== "tutti" ? data?.raccolte.find((r) => r.slug === activeTab)?.nome : null;

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
        {(data?.famiglie ?? []).map((f) => (
          <label key={f.codice}>
            <input type="checkbox" checked={famiglieSel.has(f.codice)} onChange={() => toggleSet(famiglieSel, f.codice, setFamiglieSel)} />
            {f.nome} <span className="count">{f.count}</span>
          </label>
        ))}
        {data && data.famiglie.length === 0 && <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Nessuna famiglia</p>}
      </div>
      <hr className="filter-divider" />
      <div className="filter-group">
        <h3>Raccolte</h3>
        {(data?.raccolte ?? []).map((r) => (
          <label key={r.slug}>
            <input type="checkbox" checked={raccolteSel.has(r.slug)} onChange={() => toggleSet(raccolteSel, r.slug, setRaccolteSel)} />
            {r.nome} <span className="count">{r.count}</span>
          </label>
        ))}
        {data && data.raccolte.length === 0 && <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Nessuna raccolta</p>}
      </div>
      <hr className="filter-divider" />
      <div className="filter-group">
        <h3>Disponibilità</h3>
        {/* Il dato giacenza arriva da Integra in Fase E: per ora tutto Disponibile */}
        <label><input type="checkbox" checked readOnly /> Disponibile <span className="count">{data?.articoli.length ?? 0}</span></label>
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
          <button className="ai-trigger" title="Ricerca intelligente AI" onClick={() => { setAiNotice(false); setAiOpen(true); }}>
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
                  <h2>{tabLabel ?? "Catalogo"}</h2>
                  <p className="meta">{filtered.length} articoli{tabLabel ? " · Raccolta" : ""} · Prezzi IVA esclusa</p>
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
                {(data?.raccolte ?? []).map((r) => (
                  <button key={r.slug} className={`raccolte-tab ${activeTab === r.slug ? "active" : ""}`} onClick={() => setActiveTab(r.slug)}>
                    {r.nome}
                  </button>
                ))}
              </div>

              <div className="product-grid">
                {rows.map((a) => (
                  <Link href={`/area/catalogo/${a.id}`} key={a.id} className="product-card">
                    <PositionedImage className="product-img" src={a.img} css={a.imgCss} aspect={4 / 3} alt={a.nome} />
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

              {!data && <div className="catalog-empty">Caricamento…</div>}
              {data && filtered.length === 0 && (
                <div className="catalog-empty">Nessun articolo trovato. Prova a modificare filtri o ricerca.</div>
              )}

              {totalPages > 1 && (
                <div className="pagination">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)}>←</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} className={p === page ? "active" : ""} onClick={() => setPage(p)}>{p}</button>
                  ))}
                  <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>→</button>
                </div>
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
              Mostra {filtered.length} articoli
            </button>
          </div>
        </aside>
      </div>

      {/* ── Modale Ricerca AI (la ricerca vera arriva in Fase G) ── */}
      <div className={`modal-overlay ${aiOpen ? "open" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setAiOpen(false); }}>
        <div className="modal">
          <div className="modal-head">
            <h3><span style={{ color: "var(--accent)", width: 20, height: 20, display: "inline-flex" }}>{IconStella}</span> Ricerca intelligente <span className="ai-badge">AI</span></h3>
            <button className="modal-close" onClick={() => setAiOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="modal-body">
            <p className="ai-search-desc">Descrivi quello che cerchi a parole oppure trascina o carica un&apos;immagine o un file di testo — l&apos;AI troverà i prodotti più simili nel catalogo.</p>
            <div className="ai-search-input">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              <input type="text" placeholder="Es. vaso terracotta rotondo Ø30 per esterno…" ref={aiInputRef} onKeyDown={(e) => { if (e.key === "Enter") setAiNotice(true); }} />
            </div>
            <div className="ai-upload-row">
              <label className="ai-upload-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                <span>Carica un&apos;immagine</span>
                <small>trascina o clicca</small>
                <input type="file" accept="image/*" onChange={() => setAiNotice(true)} />
              </label>
              <label className="ai-upload-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                <span>Carica un file di testo</span>
                <small>trascina o clicca</small>
                <input type="file" accept=".txt,.csv,.pdf,.doc,.docx" onChange={() => setAiNotice(true)} />
              </label>
            </div>
            <div className="ai-search-hint">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
              Prova: <span className="ai-tag" onClick={() => { if (aiInputRef.current) aiInputRef.current.value = "vaso alto per esterno resistente al gelo"; }}>vaso alto per esterno</span>
              <span className="ai-tag" onClick={() => { if (aiInputRef.current) aiInputRef.current.value = "fioriera rettangolare cotto color avana"; }}>fioriera rettangolare</span>
              <span className="ai-tag" onClick={() => { if (aiInputRef.current) aiInputRef.current.value = "cesto intrecciato per pianta da interno"; }}>cesto da interno</span>
            </div>
            {aiNotice && (
              <p style={{ marginTop: 16, marginBottom: 0, padding: "10px 14px", background: "var(--accent-soft)", borderRadius: 8, fontSize: 13 }}>
                La ricerca intelligente sarà disponibile a breve.
              </p>
            )}
          </div>
          <div className="modal-foot">
            <button className="btn btn-ghost" onClick={() => setAiOpen(false)}>Annulla</button>
            <button className="btn btn-primary" onClick={() => setAiNotice(true)}>Cerca</button>
          </div>
        </div>
      </div>
    </div>
  );
}
