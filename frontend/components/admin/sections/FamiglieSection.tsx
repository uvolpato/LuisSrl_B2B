"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../../lib/api";
import DataTable, { type Column, type RowAction } from "../DataTable";
import Modal from "../../common/Modal";
import Notice from "../../common/Notice";
import { useConfirm } from "../../common/ConfirmProvider";
import { PAGE_SIZE, PLACEHOLDER_IMG as PLACEHOLDER } from "../types";
import { IconEdit, IconEye, IconEyeOff, IconGrid, IconList } from "../icons";
import AdminTopBar from "../AdminTopBar";
import ImageDropzone from "../ImageDropzone";

interface Famiglia {
  codice: string;
  nome: string;
  nomePortale: string | null;
  codicePadre: string | null;
  immagine: string | null;
  descrizione: string | null;
  stato: string;
  _count: { articoli: number; articoliAttivi?: number };
}

/** Titolo mostrato ovunque: quello alternativo del portale se presente, altrimenti il nome Integra */
const displayNome = (r: Famiglia) => r.nomePortale || r.nome;

export default function FamiglieSection() {
  const confirm = useConfirm();

  const [items, setItems] = useState<Famiglia[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("tutte");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"list" | "grid">("list");

  const [editFamiglia, setEditFamiglia] = useState<Famiglia | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (filter === "attive") return r.stato === "ATTIVO";
      if (filter === "nascoste") return r.stato === "NASCOSTO";
      return true;
    }).filter((r) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return r.nome.toLowerCase().includes(q) || (r.nomePortale ?? "").toLowerCase().includes(q) || r.codice.toLowerCase().includes(q);
    });
  }, [items, search, filter]);

  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const reload = useCallback(async () => {
    try {
      const data = await api.get<Famiglia[]>("/api/admin/famiglie");
      setItems(data);
    } catch { setError("Errore nel caricamento delle famiglie"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { setPage(1); }, [search, filter]);

  function openEditModal(r: Famiglia) {
    setEditFamiglia(r);
    setModalOpen(true);
  }

  async function toggleStatus(r: Famiglia) {
    const newStato = r.stato === "ATTIVO" ? "NASCOSTO" : "ATTIVO";
    try {
      await api.patch(`/api/admin/famiglie/${r.codice}`, { stato: newStato });
      await reload();
    } catch { setError("Errore aggiornamento stato"); }
  }

  async function handleSave(form: {
    nomePortale?: string; descrizione?: string; immagine?: string; stato: string;
  }, pendingFile?: File | null) {
    if (!editFamiglia) return;
    try {
      if (pendingFile) {
        const fd = new FormData();
        fd.append("file", pendingFile);
        const res = await api.post<{ url: string }>(`/api/admin/famiglie/${editFamiglia.codice}/image`, fd);
        form.immagine = res.url;
      }
      await api.patch(`/api/admin/famiglie/${editFamiglia.codice}`, {
        nomePortale: form.nomePortale ?? "", descrizione: form.descrizione, immagine: form.immagine, stato: form.stato,
      });
      setModalOpen(false);
      await reload();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error("Errore nel salvataggio");
    }
  }

async function handleDelete(codice: string) {
    const ok = await confirm({
      title: "Elimina famiglia",
      message: "Sicuro di voler eliminare questa famiglia? L'operazione è irreversibile.",
      confirmLabel: "Elimina",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await api.del(`/api/admin/famiglie/${codice}`);
      setModalOpen(false);
      await reload();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "admin.famiglia_has_articoli") {
          throw new Error("Impossibile eliminare: la famiglia ha articoli associati.");
        }
        throw err;
      }
      throw new Error("Errore nell'eliminazione");
    }
  }

  const columns: Column<Famiglia>[] = [
    {
      key: "nome",
      header: "Nome",
      grow: true,
      sortable: true,
      sortValue: (r) => displayNome(r),
      cell: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={r.immagine ?? PLACEHOLDER}
            alt=""
            style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", background: "var(--bg)" }}
          />
          <div>
            <div style={{ fontWeight: 500 }}>{displayNome(r)}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{r.codice}</div>
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
      key: "articoli",
      header: "Articoli",
      width: "80px",
      align: "center",
      sortable: true,
      sortValue: (r) => r._count.articoli,
      cell: (r) => {
        const tot = r._count.articoli;
        const att = r._count.articoliAttivi ?? 0;
        return att === tot ? String(tot) : `${att}/${tot}`;
      },
    },
  ];

  const actions: RowAction<Famiglia>[] = [
    {
      icon: () => IconEdit,
      tooltip: () => "Modifica",
      onClick: (r) => openEditModal(r),
    },
    {
      icon: (r) => r.stato === "ATTIVO" ? IconEyeOff : IconEye,
      tooltip: (r) => r.stato === "ATTIVO" ? "Nascondi" : "Mostra",
      onClick: (r) => toggleStatus(r),
    },
  ];

  const meta = `${items.length} famiglie · ${items.filter((r) => r.stato === "ATTIVO").length} attive · ${items.filter((r) => r.stato === "NASCOSTO").length} nascoste`;

  return (
    <>
      <AdminTopBar
        title="Gestione Famiglie"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cerca famiglia…"
        filter={filter}
        onFilterChange={setFilter}
        filterOptions={[
          { value: "tutte", label: "Tutte" },
          { value: "attive", label: "Attive" },
          { value: "nascoste", label: "Nascoste" },
        ]}
      />

      <div className="admin-content">
        <div className="content-header">
          <div>
            <span className="meta">{meta}</span>
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
            columns={columns}
            rows={rows}
            rowKey={(r) => r.codice}
            actions={actions}
            emptyText="Nessuna famiglia trovata"
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
                <div key={r.codice} className="raccolte-card">
                  <img
                    className="raccolte-card-img"
                    src={r.immagine ?? PLACEHOLDER}
                    alt={displayNome(r)}
                    onError={(e) => { (e.target as HTMLImageElement).style.background = "var(--fg-soft)"; }}
                  />
                  <div className="raccolte-card-body">
                    <div className="raccolte-card-top">
                      <h3>{displayNome(r)}</h3>
                      <span className="raccolte-card-slug">{r.codice}</span>
                    </div>
                    {r.descrizione && (
                      <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {r.descrizione}
                      </p>
                    )}
                    <span className={`status ${r.stato === "ATTIVO" ? "status-active" : "status-hidden"}`}>
                      {r.stato === "ATTIVO" ? "Attiva" : "Nascosta"}
                    </span>
                    <div className="raccolte-card-counts">
                      <span>{r._count.articoli} articoli</span>
                    </div>
                    <div className="raccolte-card-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(r)} title="Modifica">{IconEdit} Modifica</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleStatus(r)} title={r.stato === "ATTIVO" ? "Nascondi" : "Mostra"}>
                        {r.stato === "ATTIVO" ? IconEyeOff : IconEye} {r.stato === "ATTIVO" ? "Nascondi" : "Mostra"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <FamigliaEditModal
          open={modalOpen}
          famiglia={editFamiglia}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModalOpen(false)}
        />
      </div>
    </>
  );
}

function FamigliaEditModal({
  open, famiglia, onSave, onDelete, onClose,
}: {
  open: boolean;
  famiglia: Famiglia | null;
  onSave: (form: {
    nomePortale?: string; descrizione?: string; immagine?: string; stato: string;
  }, pendingFile?: File | null) => Promise<void>;
  onDelete?: (codice: string) => Promise<void>;
  onClose: () => void;
}) {
  const [nomePortale, setNomePortale] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [stato, setStato] = useState("ATTIVO");
  const [immagineUrl, setImmagineUrl] = useState("");
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isEditing = !!famiglia;
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteClick() {
    if (!famiglia || !onDelete || deleting) return;
    setDeleting(true);
    try {
      await onDelete(famiglia.codice);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Errore nell'eliminazione");
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (famiglia) {
      setNomePortale(famiglia.nomePortale ?? "");
      setDescrizione(famiglia.descrizione ?? "");
      setStato(famiglia.stato);
      setImmagineUrl(famiglia.immagine ?? "");
    } else {
      setNomePortale("");
      setDescrizione("");
      setStato("ATTIVO");
      setImmagineUrl("");
    }
    setPendingImage(null);
    setPreviewUrl(null);
    setSaveError(null);
  }, [open, famiglia]);

  function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setPendingImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      await onSave({
        nomePortale: nomePortale.trim() || undefined,
        descrizione: descrizione.trim() || undefined,
        immagine: immagineUrl || undefined,
        stato,
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
          <h2>{isEditing ? `Modifica Famiglia: ${famiglia.nome}` : "Nuova Famiglia"}</h2>
          <button className="modal-root-close" onClick={onClose} aria-label="Chiudi">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body-edit modal-body-edit--fill">
          <form id="famiglia-form" onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, minHeight: 0, flex: 1 }}>
            <div style={{ overflow: "auto", paddingRight: 8 }}>
              {saveError && <Notice variant="error" onClose={() => setSaveError(null)}>{saveError}</Notice>}

              <div className="field" style={{ marginBottom: 10 }}>
                <label className="label">Immagine</label>
                <ImageDropzone
                  id="famiglia-image-input"
                  url={previewUrl || immagineUrl}
                  onFile={handleImageFile}
                  onRemove={() => { setPendingImage(null); setPreviewUrl(null); setImmagineUrl(""); }}
                />
              </div>

              <div className="field" style={{ marginBottom: 10 }}>
                <label className="label">Titolo alternativo</label>
                <input className="input" value={nomePortale} onChange={(e) => setNomePortale(e.target.value)} placeholder={famiglia?.nome ?? "Titolo mostrato sul portale"} />
                <span style={{ fontSize: 11, color: "var(--muted)", display: "block", marginTop: 4 }}>
                  Se compilato sostituisce ovunque il nome che arriva da Integra ({famiglia?.nome ?? "—"}).
                </span>
              </div>

              <div className="field" style={{ marginBottom: 10 }}>
                <label className="label">Descrizione</label>
                <textarea className="input" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder="Descrizione della famiglia…" rows={4} />
              </div>

              <div className="field" style={{ marginBottom: 10 }}>
                <label className="label">Stato</label>
                <select className="input" value={stato} onChange={(e) => setStato(e.target.value)}>
                  <option value="ATTIVO">Attiva</option>
                  <option value="NASCOSTO">Nascosta</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        <div className="modal-root-footer">
          {isEditing && onDelete && (
            <button
              type="button"
              className="btn btn-danger-outline btn-sm"
              onClick={handleDeleteClick}
              disabled={deleting || saving}
            >
              Elimina
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Annulla</button>
          <button type="submit" className="btn btn-primary btn-sm" form="famiglia-form" disabled={saving}>
            {saving ? "Salvataggio…" : "Salva Modifiche"}
          </button>
        </div>
      </Modal>
    </>);
}
