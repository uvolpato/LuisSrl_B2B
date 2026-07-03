"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import Notice from "../../common/Notice";
import type { Article } from "../types";
import { PAGE_SIZE, PLACEHOLDER_IMG as PLACEHOLDER } from "../types";
import AdminTopBar from "../AdminTopBar";
import DataTable, { type Column, type RowAction } from "../DataTable";
import ImportaArticoliModal from "../ImportaArticoliModal";
import { IconEdit, IconEye, IconEyeOff, IconGrid, IconList, IconPlus } from "../icons";
import ArticoloEditModal from "./ArticoloEditModal";

export default function ArticoliSection() {
  const [view, setView] = useState<"list" | "grid">("list");
  const [articleFilter, setArticleFilter] = useState("tutti");
  const [articleSearch, setArticleSearch] = useState("");
  const [artPage, setArtPage] = useState(1);
  const [articles, setArticles] = useState<Article[]>([]);
  const [artLoading, setArtLoading] = useState(true);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editCodiceLinea, setEditCodiceLinea] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function toggleArticleStatus(article: Article) {
    try {
      await api.patch(`/api/integrazione/articoli/${article.id}/stato`);
      const arts = await api.get<Article[]>("/api/integrazione/articoli");
      setArticles(arts);
    } catch { setError("Errore aggiornamento stato"); }
  }

  const articleColumns: Column<Article>[] = [
    {
      key: "articolo",
      header: "Articolo",
      grow: true,
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
      width: "35%",
      cell: (a) => (
        <span style={{ color: "var(--muted)", fontSize: 13, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
      width: "100px",
      align: "center",
      mono: true,
      sortable: true,
      sortValue: (a) => a.variantiCount ?? 0,
      cell: (a) => a.variantiCount ?? 0,
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
                    <div className="article-card-counts">{a.variantiCount ?? 0} varianti</div>
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
