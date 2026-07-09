"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../../lib/api";
import DataTable, { type Column, type RowAction } from "../DataTable";
import Modal from "../../common/Modal";
import Notice from "../../common/Notice";
import { useConfirm } from "../../common/ConfirmProvider";
import { PAGE_SIZE, PLACEHOLDER_IMG as PLACEHOLDER, type Article } from "../types";
import { IconEdit, IconEye, IconEyeOff, IconGrid, IconList, IconPlus, IconTrash } from "../icons";
import AdminTopBar from "../AdminTopBar";
import ImageDropzone from "../ImageDropzone";

interface Raccolta {
  id: number;
  nome: string;
  slug: string;
  immagine: string | null;
  descrizione: string | null;
  sconto: number | null;
  stato: string;
  createdAt: string;
  _count: { articoli: number };
}

interface RaccoltaDetail extends Raccolta {
  articoli: { articolo: { id: number; codiceLinea: string; nome: string; stato: string } }[];
}

export default function RaccolteSection() {
  const confirm = useConfirm();

  const [items, setItems] = useState<Raccolta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("tutte");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"list" | "grid">("list");

  const [editRaccolta, setEditRaccolta] = useState<RaccoltaDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [articleSearch, setArticleSearch] = useState("");

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (filter === "attive") return r.stato === "ATTIVO";
      if (filter === "nascoste") return r.stato === "NASCOSTO";
      return true;
    }).filter((r) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return r.nome.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q);
    });
  }, [items, search, filter]);

  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const reload = useCallback(async () => {
    try {
      const data = await api.get<Raccolta[]>("/api/admin/raccolte");
      setItems(data);
    } catch { setError("Errore nel caricamento delle raccolte"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { setPage(1); }, [search, filter]);

  async function openCreateModal() {
    try {
      const arts = await api.get<Article[]>("/api/integrazione/articoli");
      setAllArticles(arts);
    } catch {
      setAllArticles([]);
    }
    setEditRaccolta(null);
    setArticleSearch("");
    setModalOpen(true);
  }

  async function openEditModal(id: number) {
    try {
      const [detail, arts] = await Promise.all([
        api.get<RaccoltaDetail>(`/api/admin/raccolte/${id}`),
        api.get<Article[]>("/api/integrazione/articoli"),
      ]);
      setEditRaccolta(detail);
      setAllArticles(arts);
      setArticleSearch("");
      setModalOpen(true);
    } catch {
      setError("Errore nel caricamento della raccolta");
    }
  }

  async function handleDelete(id: number, nome: string) {
    const ok = await confirm({
      title: "Elimina raccolta",
      message: <>Eliminare la raccolta <strong>{nome}</strong>? Gli articoli associati non verranno cancellati.</>,
      tone: "danger",
      confirmLabel: "Elimina",
    });
    if (!ok) return;
    try {
      await api.del(`/api/admin/raccolte/${id}`);
      await reload();
    } catch { setError("Errore nell'eliminazione"); }
  }

  async function toggleStatus(r: Raccolta) {
    const newStato = r.stato === "ATTIVO" ? "NASCOSTO" : "ATTIVO";
    try {
      await api.put(`/api/admin/raccolte/${r.id}`, { stato: newStato });
      await reload();
    } catch { setError("Errore aggiornamento stato"); }
  }

  async function handleSave(form: {
    nome: string; slug: string; immagine?: string; descrizione?: string;
    sconto?: number; stato: string; articoliIds: number[];
  }, pendingFile?: File | null) {
    try {
      if (editRaccolta) {
        if (pendingFile) {
          const fd = new FormData();
          fd.append("file", pendingFile);
          const res = await api.post<{ url: string }>(`/api/admin/raccolte/${editRaccolta.id}/image`, fd);
          form.immagine = res.url;
        }
        await api.put(`/api/admin/raccolte/${editRaccolta.id}`, {
          nome: form.nome, slug: form.slug, immagine: form.immagine,
          descrizione: form.descrizione, sconto: form.sconto, stato: form.stato,
        });
        await api.put(`/api/admin/raccolte/${editRaccolta.id}/articoli`, { articoliIds: form.articoliIds });
      } else {
        const created = await api.post<Raccolta>("/api/admin/raccolte", form);
        if (pendingFile) {
          const fd = new FormData();
          fd.append("file", pendingFile);
          await api.post(`/api/admin/raccolte/${created.id}/image`, fd);
        }
      }
      setModalOpen(false);
      await reload();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error("Errore nel salvataggio");
    }
  }

  const columns = useMemo((): Column<Raccolta>[] => [
    {
      key: "nome",
      header: "Nome",
      grow: true,
      sortable: true,
      sortValue: (r) => r.nome,
      cell: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={r.immagine ?? PLACEHOLDER}
            alt=""
            style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", background: "var(--bg)" }}
          />
          <div>
            <div style={{ fontWeight: 500 }}>{r.nome}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{r.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: "descrizione",
      header: "Descrizione",
      width: "35%",
      cell: (r) => (
        <span style={{ color: "var(--muted)", fontSize: 13, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {r.descrizione || "—"}
        </span>
      ),
    },
    {
      key: "stato",
      header: "Stato",
      width: "100px",
      sortable: true,
      sortValue: (r) => r.stato,
      cell: (r) => (
        <span className={`status ${r.stato === "ATTIVO" ? "status-active" : "status-hidden"}`}>
          {r.stato.toLowerCase()}
        </span>
      ),
    },
    {
      key: "sconto",
      header: "Sconto",
      width: "80px",
      align: "right",
      sortable: true,
      sortValue: (r) => r.sconto ?? -1,
      cell: (r) => r.sconto != null ? `${r.sconto}%` : "—",
    },
    {
      key: "articoli",
      header: "Articoli",
      width: "80px",
      align: "center",
      sortable: true,
      sortValue: (r) => r._count.articoli,
      cell: (r) => r._count.articoli,
    },
  ], []);

  const actions = useMemo((): RowAction<Raccolta>[] => [
    {
      icon: () => IconEdit,
      tooltip: () => "Modifica",
      onClick: (r) => openEditModal(r.id),
    },
    {
      icon: (r) => r.stato === "ATTIVO" ? IconEyeOff : IconEye,
      tooltip: (r) => r.stato === "ATTIVO" ? "Nascondi" : "Mostra",
      onClick: (r) => toggleStatus(r),
    },
    {
      icon: () => IconTrash,
      tooltip: () => "Elimina",
      variant: "danger",
      onClick: (r) => handleDelete(r.id, r.nome),
    },
  ], [toggleStatus, handleDelete]);

  const meta = `${items.length} raccolte · ${items.filter((r) => r.stato === "ATTIVO").length} attive · ${items.filter((r) => r.stato === "NASCOSTO").length} nascoste`;

  return (
    <>
      <AdminTopBar
        title="Gestione Raccolte"
        searchValue={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        filterOptions={[
          { value: "tutte", label: "Tutte" },
          { value: "attive", label: "Attive" },
          { value: "nascoste", label: "Nascoste" },
        ]}
      >
        <div className="action-buttons">
          <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
            {IconPlus}
            Nuova Raccolta
          </button>
        </div>
      </AdminTopBar>

      <div className="admin-content">
        <div className="content-header">
          <div>
            <span className="meta">{meta}</span>
          </div>
          <div className="view-toggle">
            <button className={view === "list" ? "active" : ""} onClick={() => setView("list")} title="Vista riga" aria-pressed={view === "list"}>
              {IconList}
            </button>
            <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} title="Vista griglia" aria-pressed={view === "grid"}>
              {IconGrid}
            </button>
          </div>
        </div>

        {error && <Notice variant="error" onClose={() => setError(null)}>{error}</Notice>}

        {view === "list" ? (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            actions={actions}
            emptyText="Nessuna raccolta trovata"
            loading={loading}
            page={page}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
          />
        ) : (
          <div className="data-cards-scroll">
            <div className="raccolte-grid">
              {rows.map((r) => (
                <div key={r.id} className="raccolte-card">
                  <img
                    className="raccolte-card-img"
                    src={r.immagine ?? PLACEHOLDER}
                    alt={r.nome}
                    onError={(e) => { (e.target as HTMLImageElement).style.background = "var(--fg-soft)"; }}
                  />
                  <div className="raccolte-card-body">
                    <div className="raccolte-card-top">
                      <h3>{r.nome}</h3>
                      <span className="raccolte-card-slug">{r.slug}</span>
                    </div>
                    <span className={`status ${r.stato === "ATTIVO" ? "status-active" : "status-hidden"}`}>
                      {r.stato === "ATTIVO" ? "Attiva" : "Nascosta"}
                    </span>
                    <div className="raccolte-card-counts">
                      <span>{r._count.articoli} articoli</span>
                      {r.sconto != null && <span className="raccolte-card-sconto">{r.sconto}% sconto</span>}
                    </div>
                    <div className="raccolte-card-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(r.id)} title="Modifica">{IconEdit} Modifica</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleStatus(r)} title={r.stato === "ATTIVO" ? "Nascondi" : "Mostra"}>
                        {r.stato === "ATTIVO" ? IconEyeOff : IconEye} {r.stato === "ATTIVO" ? "Nascondi" : "Mostra"}
                      </button>
                      <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(r.id, r.nome)} title="Elimina">{IconTrash} Elimina</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <RaccoltaEditModal
          open={modalOpen}
          raccolta={editRaccolta}
          allArticles={allArticles}
          articleSearch={articleSearch}
          onArticleSearchChange={setArticleSearch}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      </div>
    </>
  );
}

function RaccoltaEditModal({
  open, raccolta, allArticles, articleSearch, onArticleSearchChange, onSave, onClose,
}: {
  open: boolean;
  raccolta: RaccoltaDetail | null;
  allArticles: Article[];
  articleSearch: string;
  onArticleSearchChange: (q: string) => void;
  onSave: (form: {
    nome: string; slug: string; immagine?: string; descrizione?: string;
    sconto?: number; stato: string; articoliIds: number[];
  }, pendingFile?: File | null) => Promise<void>;
  onClose: () => void;
}) {
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [sconto, setSconto] = useState("");
  const [stato, setStato] = useState("ATTIVO");
  const [immagineUrl, setImmagineUrl] = useState("");
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [articoliIds, setArticoliIds] = useState<Set<number>>(new Set());
  const [articleFilter, setArticleFilter] = useState("tutti");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isEditing = !!raccolta;

  useEffect(() => {
    if (!open) return;
    if (raccolta) {
      setNome(raccolta.nome);
      setSlug(raccolta.slug);
      setDescrizione(raccolta.descrizione ?? "");
      setSconto(raccolta.sconto != null ? String(raccolta.sconto) : "");
      setStato(raccolta.stato);
      setImmagineUrl(raccolta.immagine ?? "");
      setArticoliIds(new Set(raccolta.articoli.map((a) => a.articolo.id)));
    } else {
      setNome("");
      setSlug("");
      setDescrizione("");
      setSconto("");
      setStato("ATTIVO");
      setImmagineUrl("");
      setArticoliIds(new Set());
    }
    setPendingImage(null);
    setPreviewUrl(null);
    setArticleFilter("tutti");
    setSaveError(null);
  }, [open, raccolta]);

  function autoSlug(val: string) {
    if (!isEditing) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }

  function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  const filteredArticles = useMemo(() => allArticles.filter((a) => {
    if (articleFilter === "attivi" && a.stato !== "attivo") return false;
    if (articleFilter === "nascosti" && a.stato !== "nascosto") return false;
    if (articleFilter === "da-configurare" && a.configurato) return false;
    if (articleFilter === "non-configurati" && a.configurato !== false) return false;
    if (articleFilter === "senza-raccolta" && (a.raccolte?.length ?? 0) > 0) return false;
    if (!articleSearch) return true;
    const q = articleSearch.toLowerCase();
    return a.name.toLowerCase().includes(q) || String(a.id).toLowerCase().includes(q);
  }), [allArticles, articleFilter, articleSearch]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    if (!nome.trim()) { setSaveError("Il nome è obbligatorio"); return; }
    if (!slug.trim()) { setSaveError("Lo slug è obbligatorio"); return; }
    setSaving(true);
    try {
      await onSave({
        nome: nome.trim(),
        slug: slug.trim(),
        immagine: immagineUrl || undefined,
        descrizione: descrizione.trim() || undefined,
        sconto: sconto ? parseFloat(sconto) : undefined,
        stato,
        articoliIds: [...articoliIds],
      }, pendingImage);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.code : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} size="sm" noHeader>
      <div className="modal-root-header">
        <h2>{isEditing ? `Modifica Raccolta: ${raccolta.nome}` : "Nuova Raccolta"}</h2>
        <button className="modal-root-close" onClick={onClose} aria-label="Chiudi">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="modal-body-edit modal-body-edit--fill">
        <form id="raccolta-form" onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, minHeight: 0, flex: 1 }}>
          <div style={{ overflow: "auto", paddingRight: 24, borderRight: "1px solid var(--border)" }}>
            {saveError && <Notice variant="error" onClose={() => setSaveError(null)}>{saveError}</Notice>}

            <div className="field" style={{ marginBottom: 10 }}>
              <label className="label">Immagine</label>
              <ImageDropzone
                id="raccolta-image-input"
                url={previewUrl || immagineUrl}
                onFile={handleImageFile}
                onRemove={() => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPendingImage(null); setPreviewUrl(null); setImmagineUrl(""); }}
              />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label className="label">Nome *</label>
              <input className="input" value={nome} onChange={(e) => { setNome(e.target.value); autoSlug(e.target.value); }} placeholder="Es. Novità 2026" />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label className="label">Slug *</label>
              <input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Es. novita-2026" style={{ fontFamily: "var(--font-mono)" }} />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label className="label">Descrizione</label>
              <textarea className="input" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder="Descrizione breve della raccolta…" rows={3} />
            </div>
            <div className="field-row">
              <div className="field">
                <label className="label">Sconto (%)</label>
                <input className="input" type="number" min="0" max="100" value={sconto} onChange={(e) => setSconto(e.target.value)} placeholder="0" />
              </div>
              <div className="field">
                <label className="label">Stato</label>
                <select className="input" value={stato} onChange={(e) => setStato(e.target.value)}>
                  <option value="ATTIVO">Attiva</option>
                  <option value="NASCOSTO">Nascosta</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            <div className="top-actions" style={{ marginBottom: 12, flexShrink: 0 }}>
              <div className="admin-search">
                <span className="search-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                  </svg>
                </span>
                <input type="text" placeholder="Cerca articolo, colore…" value={articleSearch} onChange={(e) => onArticleSearchChange(e.target.value)} aria-label="Cerca articoli" />
              </div>
              <div className="filter-pills" role="group" aria-label="Filtri articoli">
                {[
                  { value: "tutti", label: "Tutti" },
                  { value: "attivi", label: "Attivi" },
                  { value: "nascosti", label: "Nascosti" },
                  { value: "da-configurare", label: "Da config." },
                  { value: "senza-raccolta", label: "Senza racc." },
                ].map((f) => (
                  <button type="button" key={f.value} className={`filter-pill ${articleFilter === f.value ? "active" : ""}`} onClick={() => setArticleFilter(f.value)} aria-pressed={articleFilter === f.value}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", height: "100%" }}>
              <DataTable
                columns={[
                  {
                    key: "articolo",
                    header: "Articolo",
                    grow: true,
                    cell: (a: Article) => (
                      <div className="cell-entity">
                        <span className={`user-status-dot ${a.configurato ? "attivo" : "bloccato"}`} />
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
                    key: "stato",
                    header: "Stato",
                    width: "120px",
                    align: "center",
                    cell: (a: Article) => (
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
                    cell: (a: Article) => a.variantiVisibiliCount !== undefined && a.variantiVisibiliCount !== (a.variantiCount ?? 0)
                      ? `${a.variantiVisibiliCount ?? 0}/${a.variantiCount ?? 0}`
                      : `${a.variantiCount ?? 0}`,
                  },
                  {
                    key: "raccolte",
                    header: "Raccolte",
                    width: "100px",
                    align: "center",
                    mono: true,
                    cell: (a: Article) => a.raccolte?.length ?? 0,
                  },
                ]}
                rows={filteredArticles}
                rowKey={(a) => a.articoloId ?? a.id}
                emptyText="Nessun articolo trovato"
                loading={false}
                page={1}
                pageSize={filteredArticles.length}
                total={filteredArticles.length}
                onPageChange={() => {}}
                selectable
                selectedKeys={articoliIds}
                onSelectionChange={(keys) => setArticoliIds(keys as Set<number>)}
              />
            </div>
          </div>
        </form>
      </div>

      <div className="modal-root-footer">
        <span style={{ fontSize: 13, color: "var(--muted)", alignSelf: "center" }}>
          {articoliIds.size} articoli selezionati
        </span>
        <div style={{ flex: 1 }} />
        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Annulla</button>
        <button type="submit" className="btn btn-primary btn-sm" form="raccolta-form" disabled={saving}>
          {saving ? "Salvataggio…" : isEditing ? "Salva Modifiche" : "Crea Raccolta"}
        </button>
      </div>
    </Modal>
    </>);
}
