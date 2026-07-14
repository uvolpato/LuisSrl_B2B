"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "../../../lib/api";
import Notice from "../../common/Notice";
import type { Article } from "../types";
import { PAGE_SIZE, PLACEHOLDER_IMG as PLACEHOLDER } from "../types";
import AdminTopBar from "../AdminTopBar";
import DataTable, { type Column, type RowAction } from "../DataTable";
import ImportaArticoliModal from "../ImportaArticoliModal";
import { IconEdit, IconEye, IconEyeOff, IconGrid, IconList, IconPlus, IconRefresh } from "../icons";
import ArticoloEditModal from "./ArticoloEditModal";

type SyncProgress = { running: boolean; pct: number; phase: string; errorText?: string };

export default function ArticoliSection() {
  const [view, setView] = useState<"list" | "grid">("list");

  // Su mobile la tabella scorre orizzontalmente e le colonne restano tagliate:
  // di default parte in vista griglia (card). Resta cambiabile a mano.
  useEffect(() => {
    if (window.matchMedia("(max-width: 640px)").matches) setView("grid");
  }, []);

  const [articleFilter, setArticleFilter] = useState("tutti");
  const [articleSearch, setArticleSearch] = useState("");
  const [artPage, setArtPage] = useState(1);
  const [articles, setArticles] = useState<Article[]>([]);
  const [artLoading, setArtLoading] = useState(true);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editCodiceLinea, setEditCodiceLinea] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncFlash, setSyncFlash] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredArticles = articles.filter((a) => {
    if (articleFilter === "attivi") return a.stato === "attivo";
    if (articleFilter === "nascosti") return a.stato === "nascosto";
    if (articleFilter === "senza-raccolta") return !a.raccolte?.length;
    if (articleFilter === "da-configurare") return a.configurato === false || a.configurato == null;
    return true;
  }).filter((a) => {
    if (!articleSearch) return true;
    const q = articleSearch.toLowerCase();
    return a.id.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
  });
  const artRows = filteredArticles.slice((artPage - 1) * PAGE_SIZE, artPage * PAGE_SIZE);
  const artMeta = `${articles.length} articoli · ${articles.filter((a) => a.stato === "attivo").length} attivi · ${articles.filter((a) => a.stato === "nascosto").length} nascosti · ${articles.reduce((s, a) => s + (a.variantiCount ?? 0), 0)} varianti`;

  useEffect(() => {
    api.get<Article[]>("/api/integrazione/articoli")
      .then(setArticles)
      .catch(() => {})
      .finally(() => setArtLoading(false));
  }, [importModalOpen]);

  useEffect(() => setArtPage(1), [articleFilter]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (flashRef.current) clearTimeout(flashRef.current);
    };
  }, []);

  async function toggleArticleStatus(article: Article) {
    try {
      await api.patch(`/api/integrazione/articoli/${article.id}/stato`);
      const arts = await api.get<Article[]>("/api/integrazione/articoli");
      setArticles(arts);
    } catch { setError("Errore aggiornamento stato"); }
  }

  async function doSync() {
    setSyncing(true);
    setSyncProgress(null);
    setSyncFlash(null);
    setSyncError(null);
    try {
      await api.post<{ status: string }>("/api/integrazione/sync");
      pollRef.current = setInterval(async () => {
        try {
          const p = await api.get<SyncProgress>("/api/integrazione/sync/progress");
          setSyncProgress(p);
          if (!p.running) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setSyncing(false);
            if (p.phase.startsWith("Err") || p.phase.startsWith("Errore")) {
              setSyncFlash("Errore");
              setSyncError(p.errorText ?? "Errore sconosciuto");
              flashRef.current = setTimeout(() => setSyncFlash(null), 3000);
            } else {
              setSyncFlash("OK");
              flashRef.current = setTimeout(() => setSyncFlash(null), 2000);
            }
          }
        } catch { /* ignore polling errors */ }
      }, 500);
    } catch {
      setSyncProgress({ running: false, pct: 0, phase: "Errore sincronizzazione" });
      setSyncing(false);
      setSyncFlash("Errore");
      setSyncError("Impossibile avviare la sincronizzazione");
      flashRef.current = setTimeout(() => setSyncFlash(null), 3000);
    }
  }

  const articleColumns: Column<Article>[] = [
    {
      key: "articolo",
      header: "Articolo",
      width: "300px",
      sortable: true,
      sortValue: (a) => a.name,
      cell: (a) => (
        <div className="cell-entity">
          <span className={`user-status-dot ${a.configurato ? "attivo" : "bloccato"}`} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="cell-entity-thumb"
            src={a.img || PLACEHOLDER}
            alt={a.name}
            onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }}
          />
          <div className="cell-entity-text">
            <span className="cell-entity-sub mono">{a.id}</span>
            <span className="cell-entity-title">{a.name}</span>
            <span className="cell-entity-sub">
              <span className="cell-swatch" style={{ background: a.coloreRgb || a.colore || "#888" }} />
              {a.colore}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "descrizione",
      header: "Descrizione",
      grow: true,
      cell: (a) => (
        <span style={{ color: "var(--muted)", fontSize: 13, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {a.descrizione || "—"}
        </span>
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
      width: "110px",
      align: "center",
      mono: true,
      sortable: true,
      sortValue: (a) => a.variantiCount ?? 0,
      cell: (a) => {
        const tot = a.variantiCount ?? 0;
        const vis = a.variantiVisibiliCount ?? 0;
        return vis === tot ? String(tot) : `${vis}/${tot}`;
      },
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
    { icon: () => IconEdit, tooltip: () => "Modifica", onClick: (a) => setEditCodiceLinea(a.id) },
    {
      icon: (a) => (a.stato === "attivo" ? IconEyeOff : IconEye),
      tooltip: (a) => (a.stato === "attivo" ? "Nascondi" : "Mostra"),
      onClick: toggleArticleStatus,
    },
  ];

  return (
    <>
      <AdminTopBar
        title="Gestione Articoli"
        searchValue={articleSearch}
        onSearchChange={setArticleSearch}
        searchPlaceholder="Cerca articolo, colore, famiglia…"
        filter={articleFilter}
        onFilterChange={setArticleFilter}
        filterOptions={[
          { value: "tutti", label: "Tutti" },
          { value: "attivi", label: "Attivi" },
          { value: "nascosti", label: "Nascosti" },
          { value: "da-configurare", label: "Da Configurare" },
          { value: "senza-raccolta", label: "Senza Raccolta" },
        ]}
      >
        <div className="action-buttons">
          <button className="admin-btn admin-btn-secondary" onClick={doSync} disabled={syncing} style={{ minWidth: 130, justifyContent: "center" }}>
            <span className={`sync-icon ${syncing ? "spin" : ""}`}>{IconRefresh}</span>
            {syncing && syncProgress ? `${syncProgress.pct}%` : syncFlash ?? "Sincronizza"}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setImportModalOpen(true)}>
            {IconPlus}
            Nuovo Articolo
          </button>
        </div>
      </AdminTopBar>
      <div className="admin-content">
        <div className="content-header">
          <div>
            <span className="meta">{artMeta}</span>
          </div>
          <div className="view-toggle">
            <button className={view === "list" ? "active" : ""} onClick={() => setView("list")} title="Vista riga">
              {IconList}
            </button>
            <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} title="Vista griglia">
              {IconGrid}
            </button>
          </div>
        </div>
        {error && <Notice variant="error" onClose={() => setError(null)}>{error}</Notice>}
        {syncError && <Notice variant="error" onClose={() => setSyncError(null)} style={{ marginBottom: 8 }}>{syncError}</Notice>}
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
            loading={artLoading}
          />
        ) : (
          <div className="data-cards-scroll">
            <div className="article-grid">
              {artRows.map((a) => (
                <div key={a.id} className="article-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="article-card-img" src={a.img || PLACEHOLDER} alt={a.name} onError={(e) => { (e.target as HTMLImageElement).style.background = "var(--fg-soft)"; }} />
                  <div className="article-card-body">
                    <div className="article-card-top">
                      <span className="article-card-id">{a.id}</span>
                      <h3>{a.name}</h3>
                      <span className="article-card-color">
                        <span className="color-swatch" style={{ background: a.coloreRgb || a.colore || "#888" }} />
                        {a.colore}
                      </span>
                    </div>
                    <span className={`status ${a.stato === "attivo" ? "status-active" : "status-hidden"}`}>
                      {a.stato}
                    </span>
                    <div className="article-card-counts">
                      {a.variantiVisibiliCount !== undefined && a.variantiVisibiliCount !== (a.variantiCount ?? 0)
                        ? `${a.variantiVisibiliCount ?? 0}/${a.variantiCount ?? 0}`
                        : `${a.variantiCount ?? 0}`}{" "}
                      varianti
                    </div>
                    <div className="article-card-counts">{a.raccolte?.length ?? 0} raccolte</div>
                    <div className="article-card-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditCodiceLinea(a.id)}>Modifica</button>
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
        <ImportaArticoliModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
        />
        <ArticoloEditModal
          open={editCodiceLinea !== null}
          codiceLinea={editCodiceLinea}
          onClose={() => setEditCodiceLinea(null)}
          onSaved={() => {
            api.get<Article[]>("/api/integrazione/articoli").then(setArticles).catch(() => {});
          }}
        />
      </div>
    </>
  );
}
