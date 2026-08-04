"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../../lib/api";
import DataTable, { type Column, type RowAction } from "../DataTable";
import Modal from "../../common/Modal";
import Notice from "../../common/Notice";
import { useConfirm } from "../../common/ConfirmProvider";
import { PAGE_SIZE } from "../types";
import { IconEdit, IconEye, IconEyeOff, IconPlus, IconRefresh, IconTrash } from "../icons";
import AdminTopBar from "../AdminTopBar";

interface Pesi { acquisti: number; tracking: number; progetti: number; affinita: number }

interface Box {
  id: number;
  titolo: string;
  prompt: string;
  ambito: string;
  nArticoli: number;
  pesi: Pesi | null;
  soloInOfferta: boolean;
  escludiAcquistati: boolean;
  scopeFamiglia: string;
  scopeRaccolta: string;
  attiva: boolean;
  ordinamento: number;
}

interface Famiglia { codice: string; nome: string; nomePortale?: string | null }
interface Raccolta { slug: string; nome: string }

const DEFAULT_PESI: Pesi = { acquisti: 0.4, tracking: 0.25, progetti: 0.2, affinita: 0.15 };
const PESI_LABEL: Record<keyof Pesi, string> = {
  acquisti: "Acquisti", tracking: "Interesse recente", progetti: "Progetti", affinita: "Clienti simili",
};

export default function BoxSuggerimentiSection() {
  const confirm = useConfirm();

  const [items, setItems] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("tutti");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [edit, setEdit] = useState<Box | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [famiglie, setFamiglie] = useState<Famiglia[]>([]);
  const [raccolte, setRaccolte] = useState<Raccolta[]>([]);
  const [rigenAll, setRigenAll] = useState<"idle" | "loading">("idle");
  const [rigenMsg, setRigenMsg] = useState<string | null>(null);

  const filtered = useMemo(() => items.filter((b) => {
    if (filter === "attivi" && !b.attiva) return false;
    if (filter === "disattivati" && b.attiva) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return b.titolo.toLowerCase().includes(q) || b.prompt.toLowerCase().includes(q);
  }), [items, search, filter]);

  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const reload = useCallback(async () => {
    try { setItems(await api.get<Box[]>("/api/admin/suggestion-boxes")); }
    catch { setError("Errore nel caricamento dei box"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { setPage(1); }, [search, filter]);

  async function loadRefs() {
    const [fam, rac] = await Promise.all([
      api.get<Famiglia[]>("/api/admin/famiglie").catch(() => []),
      api.get<Raccolta[]>("/api/admin/raccolte").catch(() => []),
    ]);
    setFamiglie(fam); setRaccolte(rac);
  }

  async function rigeneraTutti() {
    if (!(await confirm({
      title: "Rigenera tutti i box",
      message: <>Rigenerare i box dashboard di <strong>tutti i clienti attivi</strong>? Può richiedere qualche minuto.</>,
      confirmLabel: "Rigenera tutti",
    }))) return;
    setRigenAll("loading"); setRigenMsg(null);
    try {
      await api.post("/api/dashboard/suggerimenti/rigenera");
      setRigenMsg("Rigenerazione avviata: i box di tutti i clienti attivi sono stati aggiornati.");
    } catch { setError("Errore nella rigenerazione complessiva"); }
    finally { setRigenAll("idle"); }
  }

  async function openCreate() { await loadRefs(); setEdit(null); setModalOpen(true); }
  async function openEdit(b: Box) { await loadRefs(); setEdit(b); setModalOpen(true); }

  async function handleDelete(b: Box) {
    const ok = await confirm({
      title: "Elimina box",
      message: <>Eliminare il box <strong>{b.titolo}</strong>? Sparirà dalla dashboard dei clienti.</>,
      tone: "danger", confirmLabel: "Elimina",
    });
    if (!ok) return;
    try { await api.del(`/api/admin/suggestion-boxes/${b.id}`); await reload(); }
    catch { setError("Errore nell'eliminazione"); }
  }

  async function toggleAttiva(b: Box) {
    try { await api.put(`/api/admin/suggestion-boxes/${b.id}`, { attiva: !b.attiva }); await reload(); }
    catch { setError("Errore aggiornamento stato"); }
  }

  async function rigeneraBox(b: Box) {
    if (!(await confirm({
      title: "Rigenera box",
      message: <>Svuotare la cache del box <strong>{b.titolo}</strong> per tutti i clienti? Si rigenera al loro prossimo accesso.</>,
      confirmLabel: "Rigenera",
    }))) return;
    setRigenMsg(null);
    try {
      await api.post(`/api/admin/suggestion-boxes/${b.id}/rigenera`);
      setRigenMsg(`Cache del box "${b.titolo}" svuotata: si rigenera al prossimo accesso dei clienti.`);
    } catch { setError("Errore nella rigenerazione del box"); }
  }

  const columns = useMemo((): Column<Box>[] => [
    {
      key: "titolo", header: "Titolo", grow: true, sortable: true, sortValue: (b) => b.titolo,
      cell: (b) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {b.titolo}
            <span className={`status ${b.ambito === "generale" ? "status-config" : "status-active"}`} style={{ marginLeft: 8, fontSize: 11 }}>
              {b.ambito === "generale" ? "generale" : "cliente"}
            </span>
          </div>
          {b.prompt && <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 360 }}>{b.prompt}</div>}
        </div>
      ),
    },
    {
      key: "scope", header: "Ambito", width: "160px",
      cell: (b) => {
        const parts: string[] = [];
        if (b.scopeFamiglia) parts.push(`fam. ${b.scopeFamiglia}`);
        if (b.scopeRaccolta) parts.push(`racc. ${b.scopeRaccolta}`);
        if (b.soloInOfferta) parts.push("in offerta");
        return <span style={{ fontSize: 13, color: "var(--muted)" }}>{parts.length ? parts.join(" · ") : "Tutto il catalogo"}</span>;
      },
    },
    { key: "nArticoli", header: "N° art.", width: "70px", align: "center", mono: true, cell: (b) => b.nArticoli },
    {
      key: "attiva", header: "Stato", width: "100px", align: "center",
      cell: (b) => <span className={`status ${b.attiva ? "status-active" : "status-hidden"}`}>{b.attiva ? "attivo" : "disattivo"}</span>,
    },
    { key: "ordinamento", header: "Ordine", width: "80px", align: "center", mono: true, sortable: true, sortValue: (b) => b.ordinamento, cell: (b) => b.ordinamento },
  ], []);

  const actions = useMemo((): RowAction<Box>[] => [
    { icon: () => IconEdit, tooltip: () => "Modifica", onClick: (b) => openEdit(b) },
    { icon: () => IconRefresh, tooltip: () => "Rigenera questo box", onClick: (b) => rigeneraBox(b) },
    { icon: (b) => b.attiva ? IconEyeOff : IconEye, tooltip: (b) => b.attiva ? "Disattiva" : "Attiva", onClick: (b) => toggleAttiva(b) },
    { icon: () => IconTrash, tooltip: () => "Elimina", variant: "danger", onClick: (b) => handleDelete(b) },
  ], [toggleAttiva, handleDelete]);

  const meta = `${items.length} box · ${items.filter((b) => b.attiva).length} attivi`;

  return (
    <>
      <AdminTopBar
        title="Box dashboard"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cerca box…"
        filter={filter}
        onFilterChange={setFilter}
        filterOptions={[
          { value: "tutti", label: "Tutti" },
          { value: "attivi", label: "Attivi" },
          { value: "disattivati", label: "Disattivati" },
        ]}
      >
        <div className="action-buttons">
          <button className="btn btn-secondary btn-sm" onClick={rigeneraTutti} disabled={rigenAll === "loading"}>
            {rigenAll === "loading" ? "Rigenero…" : "Rigenera tutti i clienti"}
          </button>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>{IconPlus} Nuovo Box</button>
        </div>
      </AdminTopBar>

      <div className="admin-content">
        <div className="content-header"><div><span className="meta">{meta}</span></div></div>

        {error && <Notice variant="error" onClose={() => setError(null)}>{error}</Notice>}
        {rigenMsg && <Notice variant="success" onClose={() => setRigenMsg(null)}>{rigenMsg}</Notice>}

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(b) => b.id}
          actions={actions}
          emptyText="Nessun box. Creane uno per popolare la dashboard cliente."
          loading={loading}
          page={page}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPageChange={setPage}
        />

        <BoxEditModal
          open={modalOpen}
          box={edit}
          famiglie={famiglie}
          raccolte={raccolte}
          onSaved={async () => { setModalOpen(false); await reload(); }}
          onClose={() => setModalOpen(false)}
        />
      </div>
    </>
  );
}

function BoxEditModal({
  open, box, famiglie, raccolte, onSaved, onClose,
}: {
  open: boolean;
  box: Box | null;
  famiglie: Famiglia[];
  raccolte: Raccolta[];
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const isEditing = !!box;
  const [titolo, setTitolo] = useState("");
  const [prompt, setPrompt] = useState("");
  const [ambito, setAmbito] = useState("cliente");
  const [nArticoli, setNArticoli] = useState("8");
  const [ordinamento, setOrdinamento] = useState("0");
  const [attiva, setAttiva] = useState(true);
  const [soloInOfferta, setSoloInOfferta] = useState(false);
  const [escludiAcquistati, setEscludiAcquistati] = useState(true);
  const [scopeFamiglia, setScopeFamiglia] = useState("");
  const [scopeRaccolta, setScopeRaccolta] = useState("");
  const [pesi, setPesi] = useState<Pesi>(DEFAULT_PESI);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (box) {
      setTitolo(box.titolo); setPrompt(box.prompt); setAmbito(box.ambito || "cliente");
      setNArticoli(String(box.nArticoli)); setOrdinamento(String(box.ordinamento));
      setAttiva(box.attiva); setSoloInOfferta(box.soloInOfferta); setEscludiAcquistati(box.escludiAcquistati);
      setScopeFamiglia(box.scopeFamiglia ?? ""); setScopeRaccolta(box.scopeRaccolta ?? "");
      setPesi({ ...DEFAULT_PESI, ...(box.pesi ?? {}) });
    } else {
      setTitolo(""); setPrompt(""); setAmbito("cliente"); setNArticoli("8"); setOrdinamento("0");
      setAttiva(true); setSoloInOfferta(false); setEscludiAcquistati(true);
      setScopeFamiglia(""); setScopeRaccolta(""); setPesi(DEFAULT_PESI);
    }
    setSaveError(null);
  }, [open, box]);

  const pesiTot = pesi.acquisti + pesi.tracking + pesi.progetti + pesi.affinita;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    if (!titolo.trim()) { setSaveError("Il titolo è obbligatorio"); return; }
    if (pesiTot <= 0) { setSaveError("Almeno un peso deve essere maggiore di zero"); return; }
    const body = {
      titolo: titolo.trim(),
      prompt: prompt.trim(),
      ambito,
      nArticoli: Math.min(24, Math.max(1, parseInt(nArticoli, 10) || 8)),
      ordinamento: parseInt(ordinamento, 10) || 0,
      attiva, soloInOfferta, escludiAcquistati,
      scopeFamiglia, scopeRaccolta,
      pesi,
    };
    setSaving(true);
    try {
      if (isEditing) await api.put(`/api/admin/suggestion-boxes/${box.id}`, body);
      else await api.post("/api/admin/suggestion-boxes", body);
      await onSaved();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.code : "Errore nel salvataggio");
    } finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" noHeader>
      <div className="modal-root-header">
        <h2>{isEditing ? `Modifica box: ${box.titolo}` : "Nuovo box dashboard"}</h2>
        <button className="modal-root-close" onClick={onClose} aria-label="Chiudi">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="modal-body-edit">
        <form id="box-form" onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            {saveError && <Notice variant="error" onClose={() => setSaveError(null)}>{saveError}</Notice>}
            <div className="field" style={{ marginBottom: 10 }}>
              <label className="label">Titolo *</label>
              <input className="input" value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Novità per esterni" />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label className="label">Ambito</label>
              <select className="input" value={ambito} onChange={(e) => setAmbito(e.target.value)}>
                <option value="cliente">Per cliente (dati del singolo)</option>
                <option value="generale">Generale (vendite globali, uguale per tutti)</option>
              </select>
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label className="label">Prompt (intento semantico)</label>
              <textarea className="input" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
                placeholder="Es. vasi resistenti al gelo per terrazzi e giardini esterni" />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                Descrive a parole cosa mostrare: l&apos;AI lo usa per filtrare i candidati per affinità. Lascia vuoto per un box generico.
              </span>
            </div>
            <div className="field-row">
              <div className="field">
                <label className="label">N° articoli</label>
                <input className="input" type="number" min="1" max="24" value={nArticoli} onChange={(e) => setNArticoli(e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Ordine</label>
                <input className="input" type="number" value={ordinamento} onChange={(e) => setOrdinamento(e.target.value)} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label className="label">Ambito famiglia</label>
                <select className="input" value={scopeFamiglia} onChange={(e) => setScopeFamiglia(e.target.value)}>
                  <option value="">Tutte le famiglie</option>
                  {famiglie.map((f) => <option key={f.codice} value={f.codice}>{f.nomePortale || f.nome}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Ambito raccolta</label>
                <select className="input" value={scopeRaccolta} onChange={(e) => setScopeRaccolta(e.target.value)}>
                  <option value="">Tutte le raccolte</option>
                  {raccolte.map((r) => <option key={r.slug} value={r.slug}>{r.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label className="label">Stato</label>
                <select className="input" value={attiva ? "1" : "0"} onChange={(e) => setAttiva(e.target.value === "1")}>
                  <option value="1">Attivo</option>
                  <option value="0">Disattivato</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 24 }}>
            <label className="label" style={{ marginBottom: 8 }}>Vincoli</label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, fontSize: 14, whiteSpace: "nowrap" }}>
              <input type="checkbox" checked={soloInOfferta} onChange={(e) => setSoloInOfferta(e.target.checked)} style={{ width: 16, height: 16 }} />
              Solo articoli in offerta (richiede promozioni attive)
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 18, fontSize: 14, whiteSpace: "nowrap" }}>
              <input type="checkbox" checked={escludiAcquistati} onChange={(e) => setEscludiAcquistati(e.target.checked)} style={{ width: 16, height: 16 }} />
              Escludi articoli già acquistati
            </label>

            <label className="label" style={{ marginBottom: 8 }}>
              Pesi dei segnali {pesiTot > 0 && <span style={{ color: "var(--muted)", fontWeight: 400 }}>(normalizzati, tot. {pesiTot.toFixed(2)})</span>}
            </label>
            {(Object.keys(PESI_LABEL) as (keyof Pesi)[]).map((k) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ flex: 1, fontSize: 13 }}>{PESI_LABEL[k]}</span>
                <input type="range" min="0" max="1" step="0.05" value={pesi[k]}
                  onChange={(e) => setPesi((p) => ({ ...p, [k]: parseFloat(e.target.value) }))} style={{ flex: 2 }} />
                <span style={{ width: 34, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  {pesiTot > 0 ? `${Math.round((pesi[k] / pesiTot) * 100)}%` : "0%"}
                </span>
              </div>
            ))}
          </div>
        </form>
      </div>

      <div className="modal-root-footer">
        <div style={{ flex: 1 }} />
        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Annulla</button>
        <button type="submit" className="btn btn-primary btn-sm" form="box-form" disabled={saving}>
          {saving ? "Salvataggio…" : isEditing ? "Salva Modifiche" : "Crea Box"}
        </button>
      </div>
    </Modal>
  );
}
