"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../../lib/api";
import { thumbUrl } from "../../../lib/thumb";
import { formatPrice } from "../../../lib/helpers";
import DataTable, { type Column, type RowAction } from "../DataTable";
import Modal from "../../common/Modal";
import Notice from "../../common/Notice";
import { useConfirm } from "../../common/ConfirmProvider";
import { PAGE_SIZE, PLACEHOLDER_IMG as PLACEHOLDER, type Article } from "../types";
import { IconEdit, IconEye, IconEyeOff, IconPlus, IconTrash } from "../icons";
import AdminTopBar from "../AdminTopBar";

const TIPI = [
  { value: "SCONTO", label: "Sconto (€)", hasValore: true, suffix: "€" },
  { value: "PERCENTUALE", label: "Percentuale (%)", hasValore: true, suffix: "%" },
  { value: "OMAGGIO", label: "Omaggio", hasValore: false, suffix: "" },
  { value: "VETRINA", label: "Vetrina", hasValore: false, suffix: "" },
] as const;

interface Promozione {
  id: number;
  titolo: string;
  tipo: string;
  valore: string | number | null;
  dataInizio: string;
  dataFine: string;
  famiglie: string[];
  articoli: string[];
  priorita: number;
  attiva: boolean;
}

interface Famiglia {
  codice: string;
  nome: string;
  nomePortale?: string | null;
}

function statoPromo(p: Promozione): { label: string; cls: string } {
  if (!p.attiva) return { label: "disattivata", cls: "status-hidden" };
  const now = Date.now();
  if (now < new Date(p.dataInizio).getTime()) return { label: "programmata", cls: "status-config" };
  if (now > new Date(p.dataFine).getTime()) return { label: "scaduta", cls: "status-hidden" };
  return { label: "attiva", cls: "status-active" };
}

function valoreLabel(p: Pick<Promozione, "tipo" | "valore">): string {
  const v = p.valore != null ? Number(p.valore) : null;
  if (p.tipo === "SCONTO") return v != null ? formatPrice(v) : "—";
  if (p.tipo === "PERCENTUALE") return v != null ? `${v}%` : "—";
  return "—";
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function PromozioniSection() {
  const confirm = useConfirm();

  const [items, setItems] = useState<Promozione[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("tutte");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [edit, setEdit] = useState<Promozione | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [famiglie, setFamiglie] = useState<Famiglia[]>([]);
  const [allArticles, setAllArticles] = useState<Article[]>([]);

  const filtered = useMemo(() => items.filter((p) => {
    const st = statoPromo(p).label;
    if (filter === "attive" && st !== "attiva") return false;
    if (filter === "programmate" && st !== "programmata") return false;
    if (filter === "scadute" && st !== "scaduta") return false;
    if (!search) return true;
    return p.titolo.toLowerCase().includes(search.toLowerCase());
  }), [items, search, filter]);

  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const reload = useCallback(async () => {
    try {
      setItems(await api.get<Promozione[]>("/api/admin/promozioni"));
    } catch { setError("Errore nel caricamento delle promozioni"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { setPage(1); }, [search, filter]);

  async function loadRefs() {
    const [fam, arts] = await Promise.all([
      api.get<Famiglia[]>("/api/admin/famiglie").catch(() => []),
      api.get<Article[]>("/api/integrazione/articoli").catch(() => []),
    ]);
    setFamiglie(fam);
    setAllArticles(arts);
  }

  async function openCreate() {
    await loadRefs();
    setEdit(null);
    setModalOpen(true);
  }

  async function openEdit(p: Promozione) {
    await loadRefs();
    setEdit(p);
    setModalOpen(true);
  }

  async function handleDelete(p: Promozione) {
    const ok = await confirm({
      title: "Elimina promozione",
      message: <>Eliminare la promozione <strong>{p.titolo}</strong>?</>,
      tone: "danger",
      confirmLabel: "Elimina",
    });
    if (!ok) return;
    try { await api.del(`/api/admin/promozioni/${p.id}`); await reload(); }
    catch { setError("Errore nell'eliminazione"); }
  }

  async function toggleAttiva(p: Promozione) {
    try { await api.put(`/api/admin/promozioni/${p.id}`, { attiva: !p.attiva }); await reload(); }
    catch { setError("Errore aggiornamento stato"); }
  }

  const columns = useMemo((): Column<Promozione>[] => [
    {
      key: "titolo", header: "Titolo", grow: true, sortable: true, sortValue: (p) => p.titolo,
      cell: (p) => (
        <div>
          <div style={{ fontWeight: 500 }}>{p.titolo}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            {TIPI.find((t) => t.value === p.tipo)?.label ?? p.tipo}
          </div>
        </div>
      ),
    },
    { key: "valore", header: "Valore", width: "90px", align: "right", cell: (p) => valoreLabel(p) },
    {
      key: "periodo", header: "Periodo", width: "150px",
      cell: (p) => <span style={{ fontSize: 13 }}>{fmtDate(p.dataInizio)} → {fmtDate(p.dataFine)}</span>,
    },
    {
      key: "target", header: "Target", width: "150px",
      cell: (p) => {
        if (!p.famiglie.length && !p.articoli.length) return <span style={{ color: "var(--muted)" }}>Tutto il catalogo</span>;
        const parts: string[] = [];
        if (p.famiglie.length) parts.push(`${p.famiglie.length} famiglie`);
        if (p.articoli.length) parts.push(`${p.articoli.length} articoli`);
        return <span style={{ fontSize: 13 }}>{parts.join(" · ")}</span>;
      },
    },
    {
      key: "stato", header: "Stato", width: "110px", align: "center",
      cell: (p) => { const s = statoPromo(p); return <span className={`status ${s.cls}`}>{s.label}</span>; },
    },
    { key: "priorita", header: "Priorità", width: "80px", align: "center", mono: true, sortable: true, sortValue: (p) => p.priorita, cell: (p) => p.priorita },
  ], []);

  const actions = useMemo((): RowAction<Promozione>[] => [
    { icon: () => IconEdit, tooltip: () => "Modifica", onClick: (p) => openEdit(p) },
    { icon: (p) => p.attiva ? IconEyeOff : IconEye, tooltip: (p) => p.attiva ? "Disattiva" : "Attiva", onClick: (p) => toggleAttiva(p) },
    { icon: () => IconTrash, tooltip: () => "Elimina", variant: "danger", onClick: (p) => handleDelete(p) },
  ], [toggleAttiva, handleDelete]);

  const attive = items.filter((p) => statoPromo(p).label === "attiva").length;
  const meta = `${items.length} promozioni · ${attive} attive`;

  return (
    <>
      <AdminTopBar
        title="Gestione Promozioni"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cerca promozione…"
        filter={filter}
        onFilterChange={setFilter}
        filterOptions={[
          { value: "tutte", label: "Tutte" },
          { value: "attive", label: "Attive" },
          { value: "programmate", label: "Programmate" },
          { value: "scadute", label: "Scadute" },
        ]}
      >
        <div className="action-buttons">
          <button className="btn btn-primary btn-sm" onClick={openCreate}>{IconPlus} Nuova Promozione</button>
        </div>
      </AdminTopBar>

      <div className="admin-content">
        <div className="content-header">
          <div><span className="meta">{meta}</span></div>
        </div>

        {error && <Notice variant="error" onClose={() => setError(null)}>{error}</Notice>}

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(p) => p.id}
          actions={actions}
          emptyText="Nessuna promozione. Creane una per attivare i box in offerta."
          loading={loading}
          page={page}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPageChange={setPage}
        />

        <PromozioneEditModal
          open={modalOpen}
          promo={edit}
          famiglie={famiglie}
          allArticles={allArticles}
          onSaved={async () => { setModalOpen(false); await reload(); }}
          onClose={() => setModalOpen(false)}
        />
      </div>
    </>
  );
}

function toDateInput(iso: string): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

function PromozioneEditModal({
  open, promo, famiglie, allArticles, onSaved, onClose,
}: {
  open: boolean;
  promo: Promozione | null;
  famiglie: Famiglia[];
  allArticles: Article[];
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const isEditing = !!promo;
  const [titolo, setTitolo] = useState("");
  const [tipo, setTipo] = useState<string>("PERCENTUALE");
  const [valore, setValore] = useState("");
  const [dataInizio, setDataInizio] = useState("");
  const [dataFine, setDataFine] = useState("");
  const [priorita, setPriorita] = useState("0");
  const [attiva, setAttiva] = useState(true);
  const [famSel, setFamSel] = useState<Set<string>>(new Set());
  const [artSel, setArtSel] = useState<Set<string>>(new Set());
  const [targetMode, setTargetMode] = useState<"tutto" | "famiglie" | "articoli">("tutto");
  const [articleSearch, setArticleSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const tipoMeta = TIPI.find((t) => t.value === tipo);

  useEffect(() => {
    if (!open) return;
    if (promo) {
      setTitolo(promo.titolo);
      setTipo(promo.tipo);
      setValore(promo.valore != null ? String(Number(promo.valore)) : "");
      setDataInizio(toDateInput(promo.dataInizio));
      setDataFine(toDateInput(promo.dataFine));
      setPriorita(String(promo.priorita));
      setAttiva(promo.attiva);
      setFamSel(new Set(promo.famiglie));
      setArtSel(new Set(promo.articoli));
      setTargetMode(promo.articoli.length ? "articoli" : promo.famiglie.length ? "famiglie" : "tutto");
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
      setTitolo(""); setTipo("PERCENTUALE"); setValore(""); setDataInizio(today); setDataFine(in30);
      setPriorita("0"); setAttiva(true); setFamSel(new Set()); setArtSel(new Set()); setTargetMode("tutto");
    }
    setArticleSearch("");
    setSaveError(null);
  }, [open, promo]);

  const filteredArticles = useMemo(() => allArticles.filter((a) => {
    if (!articleSearch) return true;
    const q = articleSearch.toLowerCase();
    return a.name.toLowerCase().includes(q) || String(a.id).toLowerCase().includes(q);
  }), [allArticles, articleSearch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    if (!titolo.trim()) { setSaveError("Il titolo è obbligatorio"); return; }
    if (!dataInizio || !dataFine) { setSaveError("Le date sono obbligatorie"); return; }
    if (new Date(dataFine) < new Date(dataInizio)) { setSaveError("La data di fine precede l'inizio"); return; }
    if (tipoMeta?.hasValore && !valore) { setSaveError("Il valore è obbligatorio per questo tipo"); return; }

    const body = {
      titolo: titolo.trim(),
      tipo,
      valore: tipoMeta?.hasValore && valore ? parseFloat(valore) : undefined,
      dataInizio: new Date(dataInizio).toISOString(),
      dataFine: new Date(dataFine + "T23:59:59").toISOString(),
      famiglie: targetMode === "famiglie" ? [...famSel] : [],
      articoli: targetMode === "articoli" ? [...artSel] : [],
      priorita: parseInt(priorita, 10) || 0,
      attiva,
    };
    setSaving(true);
    try {
      if (isEditing) await api.put(`/api/admin/promozioni/${promo.id}`, body);
      else await api.post("/api/admin/promozioni", body);
      await onSaved();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.code : "Errore nel salvataggio");
    } finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" noHeader>
      <div className="modal-root-header">
        <h2>{isEditing ? `Modifica: ${promo.titolo}` : "Nuova Promozione"}</h2>
        <button className="modal-root-close" onClick={onClose} aria-label="Chiudi">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="modal-body-edit modal-body-edit--fill">
        <form id="promo-form" onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, minHeight: 0, flex: 1 }}>
          <div style={{ overflow: "auto", paddingRight: 24, borderRight: "1px solid var(--border)" }}>
            {saveError && <Notice variant="error" onClose={() => setSaveError(null)}>{saveError}</Notice>}

            <div className="field" style={{ marginBottom: 10 }}>
              <label className="label">Titolo *</label>
              <input className="input" value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Saldi di primavera" />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label className="label">Tipo</label>
              <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPI.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {tipoMeta?.hasValore && (
              <div className="field" style={{ marginBottom: 10 }}>
                <label className="label">Valore ({tipoMeta.suffix}) *</label>
                <input className="input" type="number" min="0" step="0.01" value={valore} onChange={(e) => setValore(e.target.value)} placeholder="0" />
              </div>
            )}
            <div className="field-row">
              <div className="field">
                <label className="label">Inizio *</label>
                <input className="input" type="date" value={dataInizio} onChange={(e) => setDataInizio(e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Fine *</label>
                <input className="input" type="date" value={dataFine} onChange={(e) => setDataFine(e.target.value)} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label className="label">Priorità</label>
                <input className="input" type="number" value={priorita} onChange={(e) => setPriorita(e.target.value)} placeholder="0" />
              </div>
              <div className="field">
                <label className="label">Stato</label>
                <select className="input" value={attiva ? "1" : "0"} onChange={(e) => setAttiva(e.target.value === "1")}>
                  <option value="1">Attiva</option>
                  <option value="0">Disattivata</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            <div style={{ marginBottom: 12, flexShrink: 0 }}>
              <label className="label" style={{ marginBottom: 6 }}>A quali prodotti si applica</label>
              <div className="filter-pills" role="group">
                {[
                  { value: "tutto", label: "Tutto il catalogo" },
                  { value: "famiglie", label: "Per famiglia" },
                  { value: "articoli", label: "Per articoli" },
                ].map((m) => (
                  <button type="button" key={m.value} className={`filter-pill ${targetMode === m.value ? "active" : ""}`}
                    onClick={() => setTargetMode(m.value as typeof targetMode)} aria-pressed={targetMode === m.value}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {targetMode === "tutto" && (
              <p style={{ color: "var(--muted)", fontSize: 14, margin: "8px 0" }}>
                La promozione si applica a tutti gli articoli configurati e disponibili.
              </p>
            )}

            {targetMode === "famiglie" && (
              <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexWrap: "wrap", gap: 8, alignContent: "flex-start" }}>
                {famiglie.map((f) => {
                  const on = famSel.has(f.codice);
                  return (
                    <button type="button" key={f.codice} className={`filter-pill ${on ? "active" : ""}`}
                      onClick={() => setFamSel((prev) => { const n = new Set(prev); on ? n.delete(f.codice) : n.add(f.codice); return n; })}>
                      {f.nomePortale || f.nome}
                    </button>
                  );
                })}
                {!famiglie.length && <span style={{ color: "var(--muted)" }}>Nessuna famiglia disponibile.</span>}
              </div>
            )}

            {targetMode === "articoli" && (
              <>
                <div className="admin-search" style={{ marginBottom: 12, flexShrink: 0 }}>
                  <span className="search-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                  </span>
                  <input type="text" placeholder="Cerca articolo, codice…" value={articleSearch} onChange={(e) => setArticleSearch(e.target.value)} aria-label="Cerca articoli" />
                </div>
                <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                  <DataTable
                    columns={[{
                      key: "articolo", header: "Articolo", grow: true,
                      cell: (a: Article) => (
                        <div className="cell-entity">
                          <img className="cell-entity-thumb" src={thumbUrl(a.img, 100) || PLACEHOLDER} alt={a.name}
                            onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
                          <div className="cell-entity-text">
                            <span className="cell-entity-sub mono">{a.id}</span>
                            <span className="cell-entity-title">{a.name}</span>
                          </div>
                        </div>
                      ),
                    }]}
                    rows={filteredArticles}
                    rowKey={(a) => a.id}
                    emptyText="Nessun articolo trovato"
                    loading={false}
                    page={1} pageSize={filteredArticles.length} total={filteredArticles.length} onPageChange={() => {}}
                    selectable
                    selectedKeys={artSel}
                    onSelectionChange={(keys) => setArtSel(keys as Set<string>)}
                  />
                </div>
              </>
            )}
          </div>
        </form>
      </div>

      <div className="modal-root-footer">
        <span style={{ fontSize: 13, color: "var(--muted)", alignSelf: "center" }}>
          {targetMode === "famiglie" ? `${famSel.size} famiglie` : targetMode === "articoli" ? `${artSel.size} articoli` : "Catalogo intero"}
        </span>
        <div style={{ flex: 1 }} />
        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Annulla</button>
        <button type="submit" className="btn btn-primary btn-sm" form="promo-form" disabled={saving}>
          {saving ? "Salvataggio…" : isEditing ? "Salva Modifiche" : "Crea Promozione"}
        </button>
      </div>
    </Modal>
  );
}
