"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import "./admin.css";
import { api, ApiError } from "../../lib/api";
import type {
  ProvisionalPasswordResponse,
  UserListResponse,
  UserProfile,
} from "../../lib/types";
import { useAuth } from "../../lib/use-auth";
import LoadingScreen from "../../components/common/LoadingScreen";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminTopBar from "../../components/admin/AdminTopBar";
import UserTable from "../../components/users/UserTable";
import UserEditorModal, {
  UserEditorTarget,
} from "../../components/users/UserEditorModal";
import ProvisionalPasswordModal from "../../components/users/ProvisionalPasswordModal";

const SECTION_TITLES: Record<string, string> = {
  clienti: "Gestione Clienti",
  articoli: "Gestione Articoli",
  famiglie: "Famiglie (da Integra)",
  raccolte: "Raccolte di portale",
  ordini: "Ordini",
  import: "Import / Export",
  ai: "AI / Ricerca",
};

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
      { codice: "COT-EST-010", dim1: { nome: "Altezza", val: "60 cm" }, dim2: { nome: "Diametro", val: "50 cm" }, multiplo: 2, giacenza: 25, prezzo: 19.50, stato: "attivo" },
      { codice: "COT-EST-011", dim1: { nome: "Altezza", val: "80 cm" }, dim2: { nome: "Diametro", val: "60 cm" }, multiplo: 1, giacenza: 10, prezzo: 32.00, stato: "attivo" },
    ],
  },
  {
    id: "ART-002", name: "Composizione Vasi Bianchi", colore: "Bianco", coloreHex: "#F5F0EB",
    famigliaPrincipale: "Fiberstone", raccolte: ["Promo"], stato: "nascosto",
    img: "/images/b2b/vasi-bianchi.webp",
    varianti: [
      { codice: "FIB-010", dim1: { nome: "Set", val: "3 pezzi" }, multiplo: 1, giacenza: 15, prezzo: 34.00, stato: "nascosto" },
    ],
  },
];

export default function AdminPage() {
  const t = useTranslations("admin");
  const tServer = useTranslations("server");
  const { user: admin, loading } = useAuth("ADMIN");

  const [section, setSection] = useState("articoli");
  const [items, setItems] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [stato, setStato] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<UserEditorTarget | null>(null);
  const [provisional, setProvisional] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const [view, setView] = useState<"list" | "grid">("list");
  const [articleFilter, setArticleFilter] = useState("tutti");
  const [articles, setArticles] = useState<Article[]>(MOCK_ARTICLES);

  const filteredArticles = articles.filter((a) => {
    if (articleFilter === "attivi") return a.stato === "attivo";
    if (articleFilter === "nascosti") return a.stato === "nascosto";
    if (articleFilter === "senza-raccolta") return !a.raccolte?.length;
    return true;
  });

  const artMeta = `${articles.length} articoli · ${articles.filter((a) => a.stato === "attivo").length} attivi · ${articles.filter((a) => a.stato === "nascosto").length} nascosti · ${articles.reduce((s, a) => s + (a.varianti?.length ?? 0), 0)} varianti`;

  const reload = useCallback(async () => {
    if (section !== "clienti") return;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (stato) params.set("stato", stato);
    const res = await api.get<UserListResponse>(`/api/users?${params}`);
    setItems(res.items);
    setTotal(res.total);
  }, [q, stato, section]);

  useEffect(() => {
    if (!loading) {
      reload().catch(() => setError("errors.generic"));
    }
  }, [loading, reload]);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "errors.generic");
    }
  }

  function onBlockToggle(u: UserProfile) {
    if (u.stato === "ATTIVO" && !window.confirm(t("confirmBlock"))) return;
    void run(async () => {
      await api.post(
        `/api/users/${u.id}/${u.stato === "ATTIVO" ? "block" : "unblock"}`,
      );
    });
  }

  function onResetPassword(u: UserProfile) {
    if (!window.confirm(t("confirmReset"))) return;
    void run(async () => {
      const res = await api.post<ProvisionalPasswordResponse>(
        `/api/users/${u.id}/reset-password`,
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

  if (loading || !admin) return <LoadingScreen />;

  return (
    <AdminLayout
      activeSection={section}
      onSectionChange={setSection}
      user={admin}
    >
      <AdminTopBar
        title={SECTION_TITLES[section] || section}
        searchValue={q}
        onSearchChange={setQ}
        filter={stato}
        onFilterChange={setStato}
      />
      <div className="admin-content">

        {/* ═══ SECTION: Articoli ═══ */}
        {section === "articoli" && (
          <>
            <div className="content-header">
              <div>
                <h2>Tutti gli articoli</h2>
                <span className="meta">{artMeta}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="filter-pills">
                  {(["tutti", "attivi", "nascosti", "senza-raccolta"] as const).map((f) => (
                    <button
                      key={f}
                      className={`filter-pill ${articleFilter === f ? "active" : ""}`}
                      onClick={() => setArticleFilter(f)}
                    >
                      {f === "tutti" ? "Tutti" : f === "attivi" ? "Attivi" : f === "nascosti" ? "Nascosti" : "Senza Raccolta"}
                    </button>
                  ))}
                </div>
                <div className="view-toggle">
                  <button className={view === "list" ? "active" : ""} onClick={() => setView("list")} title="Vista riga">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                  </button>
                  <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} title="Vista griglia">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                  </button>
                </div>
              </div>
            </div>

            {view === "list" && (
              <div className="table-header visible">
                <span></span>
                <span>Articolo</span>
                <span>Stato</span>
                <span>Varianti</span>
                <span>Raccolte</span>
                <span style={{ textAlign: "right" }}>Azioni</span>
              </div>
            )}
            <div className={`article-grid ${view === "list" ? "view-list" : ""}`}>
              {filteredArticles.map((a) => (
                <div key={a.id} className="article-card">
                  {view === "grid" && (
                    <img className="article-card-img" src={a.img || ""} alt={a.name} onError={(e) => { (e.target as HTMLImageElement).style.background = "var(--fg-soft)"; }} />
                  )}
                  {view === "list" && (
                    <img className="article-card-img" src={a.img || ""} alt={a.name} onError={(e) => { (e.target as HTMLImageElement).style.background = "var(--fg-soft)"; }} />
                  )}
                  <div className={`article-card-body${view === "grid" ? "" : ""}`}>
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
                    <div className={`article-card-counts ${view === "list" ? "article-card-variants" : ""}`}>
                      {a.varianti?.length ?? 0} varianti
                    </div>
                    <div className={`article-card-counts ${view === "list" ? "article-card-famiglie" : ""}`}>
                      {a.raccolte?.length ?? 0} raccolte
                    </div>
                    <div className="article-card-actions">
                      <button className="btn btn-secondary btn-sm">Modifica</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleArticleStatus(a)}>
                        {a.stato === "attivo" ? "Disattiva" : "Attiva"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredArticles.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)", fontSize: 14, gridColumn: "1 / -1" }}>
                  Nessun articolo trovato
                </div>
              )}
            </div>
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                {t("newClient")}
              </button>
            </div>
            {error && <div className="error-box">{tServer(error)}</div>}
            <UserTable
              items={items}
              onEdit={(u) => setEditor({ mode: "edit", user: u })}
              onResetPassword={onResetPassword}
              onBlockToggle={onBlockToggle}
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
            <button className="btn btn-primary btn-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nuova Raccolta
            </button>
          </div>
        )}

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
          password={provisional.password}
          onClose={() => setProvisional(null)}
        />
      )}
    </AdminLayout>
  );
}
