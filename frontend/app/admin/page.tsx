"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import "./admin.css";
import { api, ApiError } from "../../lib/api";
import type {
  ProvisionalPasswordResponse,
  CustomerListResponse,
  CustomerProfile,
  UserProfile,
} from "../../lib/types";
import { useAuth } from "../../lib/use-auth";
import LoadingScreen from "../../components/common/LoadingScreen";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminTopBar from "../../components/admin/AdminTopBar";
import DataTable, {
  type Column,
  type RowAction,
} from "../../components/admin/DataTable";
import AdminPanel from "../../components/admin/AdminPanel";
import UserEditorModal, {
  UserEditorTarget,
} from "../../components/users/UserEditorModal";
import ProvisionalPasswordModal from "../../components/users/ProvisionalPasswordModal";

const PAGE_SIZE = 20;

const SECTION_TITLES: Record<string, string> = {
  clienti: "Gestione Clienti",
  articoli: "Gestione Articoli",
  famiglie: "Famiglie (da Integra)",
  raccolte: "Raccolte di portale",
  ordini: "Ordini",
  import: "Import / Export",
  ai: "AI / Ricerca",
  "admin-panel": "Pannello di Amministrazione",
};

// ── Icone (stroke style del prototipo) ──
const svg = (paths: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {paths}
  </svg>
);
const IconEdit = svg(<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>);
const IconReset = svg(<><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="16" cy="12" r="1" fill="currentColor" /></>);
const IconLock = svg(<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>);
const IconUnlock = svg(<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.9-1" /></>);
const IconEye = svg(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>);
const IconEyeOff = svg(<><path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-2.3 3.2M6.3 6.3A18 18 0 0 0 2 11s3.5 7 10 7a10 10 0 0 0 4-.8" /><path d="m4 3 16 16" /></>);
const IconPlus = svg(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>);

function initials(name: string): string {
  return name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "??";
}

interface ArticleVariant {
  codice: string;
  descIntegra?: string;
  dim1?: { nome: string; val: string } | null;
  dim2?: { nome: string; val: string } | null;
  multiplo?: number;
  giacenza?: number;
  prezzo?: number;
  stato?: string;
}

interface Article {
  id: string;
  name: string;
  colore: string;
  coloreHex?: string;
  famigliaPrincipale?: string;
  raccolte?: string[];
  stato: "attivo" | "nascosto";
  img?: string;
  varianti?: ArticleVariant[];
}

const MOCK_ARTICLES: Article[] = [
  {
    id: "ART-001", name: "Vaso Cotto Esterno", colore: "Terracotta", coloreHex: "#C67B5C",
    famigliaPrincipale: "Cotto da Esterno", raccolte: ["Best Seller"], stato: "attivo",
    img: "/images/b2b/catalogo-cotto-esterni.webp",
    varianti: [
      { codice: "COT-EST-010", dim1: { nome: "Altezza", val: "60 cm" }, dim2: { nome: "Diametro", val: "50 cm" }, multiplo: 2, giacenza: 25, prezzo: 19.5, stato: "attivo" },
      { codice: "COT-EST-011", dim1: { nome: "Altezza", val: "80 cm" }, dim2: { nome: "Diametro", val: "60 cm" }, multiplo: 1, giacenza: 10, prezzo: 32.0, stato: "attivo" },
    ],
  },
  {
    id: "ART-002", name: "Composizione Vasi Bianchi", colore: "Bianco", coloreHex: "#F5F0EB",
    famigliaPrincipale: "Fiberstone", raccolte: ["Promo"], stato: "nascosto",
    img: "/images/b2b/vasi-bianchi.webp",
    varianti: [
      { codice: "FIB-010", dim1: { nome: "Set", val: "3 pezzi" }, multiplo: 1, giacenza: 15, prezzo: 34.0, stato: "nascosto" },
    ],
  },
];

export default function AdminPage() {
  const t = useTranslations("admin");
  const tServer = useTranslations("server");
  const { user: admin, loading } = useAuth("admin");

  const [section, setSection] = useState("articoli");

  // ── Clienti (dati reali, paginazione server-side) ──
  const [items, setItems] = useState<CustomerProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [stato, setStato] = useState("");
  const [cliPage, setCliPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<UserEditorTarget | null>(null);
  const [provisional, setProvisional] = useState<{
    email: string;
    password: string;
  } | null>(null);

  // ── Articoli (mock, paginazione client-side) ──
  const [view, setView] = useState<"list" | "grid">("list");
  const [articleFilter, setArticleFilter] = useState("tutti");
  const [articleSearch, setArticleSearch] = useState("");
  const [artPage, setArtPage] = useState(1);
  const [articles, setArticles] = useState<Article[]>(MOCK_ARTICLES);

  const filteredArticles = articles.filter((a) => {
    if (articleFilter === "attivi") return a.stato === "attivo";
    if (articleFilter === "nascosti") return a.stato === "nascosto";
    if (articleFilter === "senza-raccolta") return !a.raccolte?.length;
    return true;
  }).filter((a) => {
    if (!articleSearch) return true;
    const q = articleSearch.toLowerCase();
    return a.id.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
  });
  const artRows = filteredArticles.slice((artPage - 1) * PAGE_SIZE, artPage * PAGE_SIZE);
  const artMeta = `${articles.length} articoli · ${articles.filter((a) => a.stato === "attivo").length} attivi · ${articles.filter((a) => a.stato === "nascosto").length} nascosti · ${articles.reduce((s, a) => s + (a.varianti?.length ?? 0), 0)} varianti`;

  const reload = useCallback(async () => {
    if (section !== "clienti") return;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (stato) params.set("stato", stato);
    params.set("page", String(cliPage));
    params.set("pageSize", String(PAGE_SIZE));
    const res = await api.get<CustomerListResponse>(`/api/customers?${params}`);
    setItems(res.items);
    setTotal(res.total);
  }, [q, stato, cliPage, section]);

  useEffect(() => {
    if (!loading) {
      reload().catch(() => setError("errors.generic"));
    }
  }, [loading, reload]);

  // Tornare a pagina 1 quando cambiano ricerca/filtro/sezione
  useEffect(() => setCliPage(1), [q, stato, section]);
  useEffect(() => setArtPage(1), [articleFilter]);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "errors.generic");
    }
  }

  function onBlockToggle(u: CustomerProfile) {
    if (u.stato === "ATTIVO" && !window.confirm(t("confirmBlock"))) return;
    void run(async () => {
      await api.post(
        `/api/customers/${u.id}/${u.stato === "ATTIVO" ? "block" : "unblock"}`,
      );
    });
  }

  function onResetPassword(u: CustomerProfile) {
    if (!window.confirm(t("confirmReset"))) return;
    void run(async () => {
      const res = await api.post<ProvisionalPasswordResponse>(
        `/api/customers/${u.id}/reset-password`,
      );
      setProvisional({ email: u.email, password: res.provisionalPassword });
    });
  }

  function toggleArticleStatus(article: Article) {
    setArticles((prev) =>
      prev.map((a) =>
        a.id === article.id
          ? { ...a, stato: a.stato === "attivo" ? "nascosto" : "attivo" }
          : a,
      ),
    );
  }

  // ── Configurazione tabella Clienti ──
  const clientColumns: Column<CustomerProfile>[] = [
    {
      key: "cliente",
      header: "Cliente",
      grow: true,
      cell: (u) => (
        <div className="cell-entity">
          <span className="cell-entity-thumb">{initials(u.nome)}</span>
          <div className="cell-entity-text">
            <span className="cell-entity-sub">{u.email}</span>
            <span className="cell-entity-title">{u.nome || "—"}</span>
            <span className="cell-entity-sub">{u.ragioneSociale || "—"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "piva",
      header: "P.IVA",
      width: "150px",
      mono: true,
      cell: (u) => u.partitaIva || "—",
    },
    {
      key: "stato",
      header: "Stato",
      width: "120px",
      align: "center",
      cell: (u) => (
        <span className={`status ${u.stato === "ATTIVO" ? "status-active" : "status-hidden"}`}>
          {u.stato === "ATTIVO" ? t("statusActive") : t("statusBlocked")}
        </span>
      ),
    },
  ];
  const clientActions: RowAction<CustomerProfile>[] = [
    { icon: () => IconEdit, tooltip: () => t("edit"), onClick: (u) => setEditor({ mode: "edit", user: u }) },
    { icon: () => IconReset, tooltip: () => t("resetPassword"), onClick: onResetPassword },
    {
      icon: (u) => (u.stato === "ATTIVO" ? IconLock : IconUnlock),
      tooltip: (u) => (u.stato === "ATTIVO" ? t("block") : t("unblock")),
      onClick: onBlockToggle,
      variant: "danger",
    },
  ];

  // ── Configurazione tabella Articoli ──
  const articleColumns: Column<Article>[] = [
    {
      key: "articolo",
      header: "Articolo",
      grow: true,
      sortable: true,
      sortValue: (a) => a.name,
      cell: (a) => (
        <div className="cell-entity">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="cell-entity-thumb"
            src={a.img || ""}
            alt={a.name}
            onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }}
          />
          <div className="cell-entity-text">
            <span className="cell-entity-sub mono">{a.id}</span>
            <span className="cell-entity-title">{a.name}</span>
            <span className="cell-entity-sub">
              <span className="cell-swatch" style={{ background: a.coloreHex || "#888" }} />
              {a.colore}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "stato",
      header: "Stato",
      width: "120px",
      align: "center",
      sortable: true,
      sortValue: (a) => a.stato,
      cell: (a) => (
        <span className={`status ${a.stato === "attivo" ? "status-active" : "status-hidden"}`}>
          {a.stato}
        </span>
      ),
    },
    {
      key: "varianti",
      header: "Varianti",
      width: "100px",
      align: "center",
      mono: true,
      sortable: true,
      sortValue: (a) => a.varianti?.length ?? 0,
      cell: (a) => a.varianti?.length ?? 0,
    },
    {
      key: "raccolte",
      header: "Raccolte",
      width: "100px",
      align: "center",
      mono: true,
      sortable: true,
      sortValue: (a) => a.raccolte?.length ?? 0,
      cell: (a) => a.raccolte?.length ?? 0,
    },
  ];
  const articleActions: RowAction<Article>[] = [
    { icon: () => IconEdit, tooltip: () => "Modifica", onClick: () => {} },
    {
      icon: (a) => (a.stato === "attivo" ? IconEyeOff : IconEye),
      tooltip: (a) => (a.stato === "attivo" ? "Nascondi" : "Mostra"),
      onClick: toggleArticleStatus,
    },
  ];

  if (loading || !admin || admin.userType !== "admin") return <LoadingScreen />;

  return (
    <AdminLayout
      activeSection={section}
      onSectionChange={setSection}
      user={admin}
    >
      <AdminTopBar
        title={SECTION_TITLES[section] || section}
        searchValue={section === "articoli" ? articleSearch : q}
        onSearchChange={(v) => section === "articoli" ? setArticleSearch(v) : setQ(v)}
        filter={section === "articoli" ? articleFilter : stato}
        onFilterChange={(v) => section === "articoli" ? setArticleFilter(v) : setStato(v)}
        filterOptions={
          section === "articoli"
            ? [
                { value: "tutti", label: "Tutti" },
                { value: "attivi", label: "Attivi" },
                { value: "nascosti", label: "Nascosti" },
                { value: "senza-raccolta", label: "Senza Raccolta" },
              ]
            : undefined
        }
      >
        {section === "articoli" && (
          <div className="action-buttons">
            <button className="btn btn-secondary btn-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 16, height: 16 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Importa Excel
            </button>
            <button className="btn btn-primary btn-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nuovo Articolo
            </button>
          </div>
        )}
      </AdminTopBar>
      <div className="admin-content">

        {/* ═══ SECTION: Articoli ═══ */}
        {section === "articoli" && (
          <>
            <div className="content-header">
              <div>
                <h2>Tutti gli articoli</h2>
                <span className="meta">{artMeta}</span>
              </div>
                <div className="view-toggle">
                  <button className={view === "list" ? "active" : ""} onClick={() => setView("list")} title="Vista riga">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                  </button>
                  <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} title="Vista griglia">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                  </button>
                </div>
            </div>

            {view === "list" ? (
              <DataTable
                columns={articleColumns}
                rows={artRows}
                rowKey={(a) => a.id}
                actions={articleActions}
                emptyText="Nessun articolo trovato"
                page={artPage}
                pageSize={PAGE_SIZE}
                total={filteredArticles.length}
                onPageChange={setArtPage}
              />
            ) : (
              <div className="data-cards-scroll">
                <div className="article-grid">
                  {artRows.map((a) => (
                    <div key={a.id} className="article-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="article-card-img" src={a.img || ""} alt={a.name} onError={(e) => { (e.target as HTMLImageElement).style.background = "var(--fg-soft)"; }} />
                      <div className="article-card-body">
                        <div className="article-card-top">
                          <span className="article-card-id">{a.id}</span>
                          <h3>{a.name}</h3>
                          <span className="article-card-color">
                            <span className="color-swatch" style={{ background: a.coloreHex || "#888" }} />
                            {a.colore}
                          </span>
                        </div>
                        <span className={`status ${a.stato === "attivo" ? "status-active" : "status-hidden"}`}>
                          {a.stato}
                        </span>
                        <div className="article-card-counts">{a.varianti?.length ?? 0} varianti</div>
                        <div className="article-card-counts">{a.raccolte?.length ?? 0} raccolte</div>
                        <div className="article-card-actions">
                          <button className="btn btn-secondary btn-sm">Modifica</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => toggleArticleStatus(a)}>
                            {a.stato === "attivo" ? "Disattiva" : "Attiva"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {artRows.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)", fontSize: 14, gridColumn: "1 / -1" }}>
                      Nessun articolo trovato
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ SECTION: Clienti ═══ */}
        {section === "clienti" && (
          <>
            <div className="content-header">
              <div>
                <h2>Tutti i clienti</h2>
                <span className="meta">{t("total", { count: total })}</span>
              </div>
              <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => setEditor({ mode: "create" })}>
                {IconPlus}
                {t("newClient")}
              </button>
            </div>
            {error && <div className="error-box">{tServer(error)}</div>}
            <DataTable
              columns={clientColumns}
              rows={items}
              rowKey={(u) => u.id}
              actions={clientActions}
              emptyText={t("noResults")}
              page={cliPage}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setCliPage}
            />
          </>
        )}

        {/* ═══ SECTION: Famiglie ═══ */}
        {section === "famiglie" && (
          <div className="content-header">
            <div>
              <h2>Famiglie (da Integra)</h2>
              <span className="meta">Raggruppamenti gerarchici importati dal gestionale. Non modificabili dal portale.</span>
            </div>
          </div>
        )}

        {/* ═══ SECTION: Raccolte ═══ */}
        {section === "raccolte" && (
          <div className="content-header">
            <div>
              <h2>Raccolte di portale</h2>
              <span className="meta">Collezioni/etichette gestite e modificate dal portale. Ogni Articolo può appartenere a più Raccolte.</span>
            </div>
            <button className="admin-btn admin-btn-primary admin-btn-sm">
              {IconPlus}
              Nuova Raccolta
            </button>
          </div>
        )}

        {/* ═══ Admin Panel ═══ */}
        {section === "admin-panel" && <AdminPanel />}

        {/* ═══ Other sections ═══ */}
        {["ordini", "import", "ai"].includes(section) && (
          <div className="content-header">
            <div>
              <h2>{SECTION_TITLES[section]}</h2>
              <span className="meta">Sezione in sviluppo</span>
            </div>
          </div>
        )}
      </div>

      {editor && (
        <UserEditorModal
          target={editor}
          onClose={() => setEditor(null)}
          onSaved={(prov) => {
            setEditor(null);
            if (prov) setProvisional(prov);
            void reload();
          }}
        />
      )}

      {provisional && (
        <ProvisionalPasswordModal
          email={provisional.email}
          onClose={() => setProvisional(null)}
        />
      )}
    </AdminLayout>
  );
}
