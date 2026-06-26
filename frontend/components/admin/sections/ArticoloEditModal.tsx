"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../../lib/api";
import Modal from "../../common/Modal";
import Notice from "../../common/Notice";
import { useConfirm } from "../../common/ConfirmProvider";
import { IconInfo, IconSearch, IconPlus, IconChevronLeft, IconChevronRight, IconEye, IconEyeOff } from "../icons";
import DataTable, { type Column, type RowAction } from "../DataTable";
import EditImageModal from "./EditImageModal";
interface VarianteDetail {
  codice: string;
  descrizione: string;
  dimensioni?: Record<string, string> | null;
  multiplo: number;
  giacenza: number;
  stato: string;
}

interface ArticoloDetail {
  id: string;
  codiceLinea: string;
  nome: string;
  colore: string;
  coloreRgb?: string;
  stato: "attivo" | "nascosto";
  configurato: boolean;
  famiglia: { codice: string; nome: string };
  variantiCount: number;
  updatedAt: string;
  varianti: VarianteDetail[];
  immagini: { id: number; url: string; ordinamento: number; copertina: boolean; tipo: string; inGalleria: boolean; css: string }[];
}

const tabs = [
  { key: "generale", label: "Generale" },
  { key: "immagini", label: "Immagini" },
  { key: "varianti", label: "Varianti" },
  { key: "descrizione-ai", label: "Descrizione AI" },
  { key: "famiglia", label: "Famiglia" },
  { key: "raccolte", label: "Raccolte" },
];

const subTabs = [
  { key: "ordine", label: "Galleria" },
  { key: "white", label: "Sfondo Bianco" },
  { key: "ai", label: "Immagini AI" },
];

export default function ArticoloEditModal({
  open,
  codiceLinea,
  onClose,
  onSaved,
}: {
  open: boolean;
  codiceLinea: string | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [article, setArticle] = useState<ArticoloDetail | null>(null);
  const [activeTab, setActiveTab] = useState("generale");
  const [activeSubTab, setActiveSubTab] = useState("ordine");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  const [editNome, setEditNome] = useState("");
  const [editColore, setEditColore] = useState("");
  const [editColoreRgb, setEditColoreRgb] = useState("");
  const [editStato, setEditStato] = useState<"attivo" | "nascosto">("attivo");
  const [editVarianti, setEditVarianti] = useState<Record<string, string>>({});
  const [vPage, setVPage] = useState(1);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [immaginiOrdine, setImmaginiOrdine] = useState<number[] | null>(null);
  const [pendingExtra, setPendingExtra] = useState<File[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragGalleriaOver, setDragGalleriaOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [immaginiGalleria, setImmaginiGalleria] = useState<Record<number, boolean> | null>(null);
  const [immaginiDisplay, setImmaginiDisplay] = useState<Record<number, { css: string }>>({});
  const [pendingDeleteImages, setPendingDeleteImages] = useState<number[]>([]);
  const [editingImage, setEditingImage] = useState<number | null>(null);

  const fetch = useCallback(async () => {
    if (!codiceLinea) return;
    setLoading(true);
    setError(null);
    try {
      const a = await api.get<ArticoloDetail>(`/api/integrazione/articoli/${codiceLinea}`);
      setArticle(a);
      setEditNome(a.nome);
      setEditColore(a.colore);
      setEditColoreRgb(a.coloreRgb || "");
      setEditStato(a.stato);
      setEditVarianti(Object.fromEntries(a.varianti.map((v) => [v.codice, v.stato])));
      setVPage(1);
      setPendingImages([]);
      setImmaginiOrdine(null);
      setPendingExtra([]);
      setUploadError(null);
      setImmaginiGalleria(null);
      setImmaginiDisplay({});
      setPendingDeleteImages([]);
    } catch {
      setError("Errore caricamento articolo");
    } finally {
      setLoading(false);
    }
  }, [codiceLinea]);

  useEffect(() => { if (open && codiceLinea) fetch(); else setActiveTab("generale"); }, [open, codiceLinea, fetch]);

  const isDirty = useMemo(() => {
    if (!article) return false;
    if (editNome !== article.nome) return true;
    if (editColore !== article.colore) return true;
    if (editColoreRgb !== (article.coloreRgb || "")) return true;
    if (editStato !== article.stato) return true;
    if (pendingImages.length > 0 || pendingExtra.length > 0) return true;
    if (pendingDeleteImages.length > 0) return true;
    if (immaginiOrdine) return true;
    if (Object.keys(immaginiDisplay).length > 0) return true;
    for (const v of article.varianti) {
      if ((editVarianti[v.codice] || v.stato) !== v.stato) return true;
    }
    return false;
  }, [article, editNome, editColore, editColoreRgb, editStato, editVarianti, immaginiOrdine, pendingImages, pendingExtra, pendingDeleteImages, immaginiGalleria, immaginiDisplay]);

  async function handleClose() {
    if (!isDirty) { onClose(); return; }
    if (await confirm({ title: "Modifiche non salvate", message: "Vuoi salvare le modifiche prima di chiudere?", confirmLabel: "Salva e chiudi", cancelLabel: "Esci senza salvare" })) {
      handleSave();
    } else {
      onClose();
    }
  }

  async function handleSave() {
    if (!article) return;
    setSaving(true);
    setError(null);
    try {
      if (pendingImages.length > 0) {
        const form = new FormData();
        pendingImages.forEach((f) => form.append('files', f));
        await api.post(`/api/integrazione/articoli/${article.codiceLinea}/immagini`, form);
      }
      if (pendingExtra.length > 0) {
        const form = new FormData();
        pendingExtra.forEach((f) => form.append('files', f));
        form.append('tipo', 'GALLERIA');
        await api.post(`/api/integrazione/articoli/${article.codiceLinea}/immagini`, form);
      }
      const payload: Record<string, unknown> = { nome: editNome, colore: editColore, coloreRgb: editColoreRgb || null, stato: editStato, varianti: editVarianti };
      if (immaginiOrdine) payload.immaginiOrdine = immaginiOrdine;
      if (immaginiGalleria) payload.immaginiGalleria = immaginiGalleria;
      if (Object.keys(immaginiDisplay).length > 0) payload.immaginiDisplay = immaginiDisplay;
      if (pendingDeleteImages.length > 0) payload.immaginiDaEliminare = pendingDeleteImages;
      await api.put(`/api/integrazione/articoli/${article.codiceLinea}`, payload);
      onSaved?.();
      fetch();
    } catch (e) {
      console.error("Save error", e);
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!article) return;
    if (!(await confirm({ message: `Eliminare l'articolo "${article.nome}"?`, tone: "danger" }))) return;
    setSaving(true);
    try {
      await api.del(`/api/integrazione/articoli/${article.codiceLinea}`);
      onSaved?.();
      onClose();
    } catch {
      setError("Errore eliminazione");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfigura() {
    if (!article) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/integrazione/articoli/${article.codiceLinea}/configura`);
      onSaved?.();
      await fetch();
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "Errore configurazione");
    } finally {
      setSaving(false);
    }
  }

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });

  function imgStyle(img: { id: number; css: string }): React.CSSProperties {
    const css = immaginiDisplay[img.id]?.css || img.css;
    const parts: Record<string, string> = {};
    css.split(";").filter(Boolean).forEach((p) => { const [k, v] = p.split(":"); if (k && v) parts[k.trim()] = v.trim(); });
    const s: React.CSSProperties = { width: "100%", height: "100%", display: "block" };
    if (parts["object-fit"]) s.objectFit = parts["object-fit"] as any;
    if (parts["object-position"]) s.objectPosition = parts["object-position"];
    if (parts.transform) s.transform = parts.transform;
    return s;
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={handleClose} size="sm" noHeader>
      <div className="modal-root-header">
        <h2>{article?.nome || "Dettaglio Articolo"}</h2>
        <button className="modal-root-close" onClick={onClose} aria-label="Chiudi">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>

      <div className="modal-tabs-bar">
        {tabs.map((t) => (
          <button key={t.key} className={`modal-tab-btn ${activeTab === t.key ? "active" : ""}`} onClick={() => { setActiveTab(t.key); if (t.key === "immagini") setActiveSubTab("ordine"); }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className={`modal-body-edit${activeTab === "varianti" || activeTab === "immagini" ? " modal-body-edit--fill" : ""}`}>
        {error && <Notice variant="error" onClose={() => setError(null)} style={{ marginBottom: 16 }}>{error}</Notice>}

        {loading && <p style={{ color: "var(--muted)", padding: 40, textAlign: "center" }}>Caricamento…</p>}

        {!loading && article && (
          <>
            {activeTab === "generale" && (
              <div>
                <div className="field-row">
                  <div className="field">
                    <label>Codice Articolo</label>
                    <input className="input" type="text" value={article.codiceLinea} readOnly />
                  </div>
                  <div className="field">
                    <label>Colore</label>
                    <div style={{ position: "relative", display: "flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface)", boxSizing: "border-box" }}>
                      <input type="text" value={editColore} onChange={(e) => setEditColore(e.target.value)} placeholder="# esadecimale" className="input" style={{ border: "none", background: "transparent", padding: "10px 14px", flex: 1, minWidth: 0 }} />
                      <label htmlFor="color-picker-article" style={{ width: 22, height: 22, margin: 0, marginRight: 10, borderRadius: 3, background: editColoreRgb || editColore || "#ccc", cursor: "pointer", border: "2px solid rgba(0,0,0,.15)", flexShrink: 0, display: "block" }} />
                      {/* ancorato sotto lo swatch: il picker nativo si apre sotto il quadrato */}
                      <input id="color-picker-article" type="color" value={editColoreRgb || "#000000"} onChange={(e) => setEditColoreRgb(e.target.value)} style={{ width: 22, height: 0, padding: 0, margin: 0, border: "none", opacity: 0, position: "absolute", right: 10, bottom: 0, pointerEvents: "none" }} />
                    </div>
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Nome Articolo</label>
                    <input className="input" type="text" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Stato Pubblicazione</label>
                    {article.configurato ? (
                      <select className="input" value={editStato} onChange={(e) => setEditStato(e.target.value as "attivo" | "nascosto")}>
                        <option value="attivo">Attivo</option>
                        <option value="nascosto">Nascosto</option>
                      </select>
                    ) : (
                      <>
                        <input className="input" type="text" value="Nascosto" readOnly />
                        <span style={{ fontSize: 11, color: "var(--muted)", display: "block", marginTop: 4 }}>Disponibile dopo la configurazione.</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Ultimo aggiornamento</label>
                    <input className="input" type="text" value={fmtDate(article.updatedAt)} readOnly />
                  </div>
                  <div className="field">
                    <label>Numero varianti</label>
                    <input className="input" type="text" value={`${article.variantiCount} varianti`} readOnly />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "immagini" && (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, height: "100%" }}>
                <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid var(--border)" }}>
                  {subTabs.map((st) => (
                    <button key={st.key} className={`subtab-btn ${activeSubTab === st.key ? "active" : ""}`} onClick={() => setActiveSubTab(st.key)}>
                      {st.label}
                    </button>
                  ))}
                </div>
                {activeSubTab === "ordine" && (
                  <div
                    style={{ flex: 1, display: "flex", flexDirection: "column", ...(dragGalleriaOver ? { outline: "2px dashed var(--accent)", outlineOffset: -2, borderRadius: "var(--radius)", padding: 16 } : { padding: 16 }) }}
                    onDragOver={(e) => { if (dragIdx !== null) return; e.preventDefault(); setDragGalleriaOver(true); }}
                    onDragEnter={(e) => { if (dragIdx !== null) return; e.preventDefault(); setDragGalleriaOver(true); }}
                    onDragLeave={(e) => { if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) setDragGalleriaOver(false); }}
                    onDrop={(e) => { e.preventDefault(); setDragGalleriaOver(false); if (dragIdx !== null) return; setUploadError(null); const nonImage: string[] = []; const images: File[] = []; Array.from(e.dataTransfer.files).forEach((f) => { if (f.type.startsWith("image/")) images.push(f); else nonImage.push(f.name); }); if (nonImage.length > 0) setUploadError(`File non supportati: ${nonImage.join(", ")}. Solo immagini.`); if (images.length > 0) setPendingExtra((prev) => [...prev, ...images]); }}
                  >
                    <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 14 }}>Tutte le immagini. Attiva/disattiva la visibilità in galleria. La prima è la copertina.</p>
                    {uploadError && <Notice variant="error" onClose={() => setUploadError(null)} style={{ marginBottom: 12 }}>{uploadError}</Notice>}
                    <div className="gallery-compact">
                      {(immaginiOrdine ?? article.immagini.sort((a, b) => a.ordinamento - b.ordinamento).map((i) => i.id)).filter((id) => !pendingDeleteImages.includes(id)).map((id, idx) => {
                        const img = article.immagini.find((i) => i.id === id);
                        if (!img) return null;
                        const isDrag = dragIdx === idx;
                        const galleriaVal = immaginiGalleria?.[img.id] ?? img.inGalleria;
                        const desaturate = img.tipo === 'GALLERIA' && !galleriaVal;
                        return (
                          <div
                            key={img.id}
                            className="gallery-item"
                            draggable
                            onClick={() => setEditingImage(img.id)}
                            onDragStart={(e) => { setDragIdx(idx); e.dataTransfer.setData('text/plain', ''); }}
                            onDragOver={(e) => { if (dragIdx === null) return; e.preventDefault(); if (dragIdx !== idx) { const list = immaginiOrdine ?? article.immagini.sort((a, b) => a.ordinamento - b.ordinamento).map((i) => i.id); const copy = [...list]; const [moved] = copy.splice(dragIdx, 1); copy.splice(idx, 0, moved); setImmaginiOrdine(copy); setDragIdx(idx); } }}
                            onDragEnd={() => setDragIdx(null)}
                            style={{ background: isDrag ? "var(--accent-soft)" : "var(--fg-soft)", opacity: isDrag ? 0.6 : 1, cursor: "grab", position: "relative", display: "flex" }}
                          >
                             <img src={img.url} alt="" draggable={false} style={{ ...imgStyle(img), filter: desaturate ? "grayscale(1)" : "none" }} />
                            {idx === 0 && <span className="cover-badge">Copertina</span>}
                            <button type="button" onClick={() => setImmaginiGalleria((prev) => ({ ...prev ?? {}, [img.id]: !(prev?.[img.id] ?? img.inGalleria) }))} style={{ position: "absolute", bottom: 4, right: 4, width: 24, height: 24, borderRadius: "50%", border: `2px solid ${galleriaVal ? "var(--accent)" : "var(--muted)"}`, background: galleriaVal ? "var(--accent)" : "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: galleriaVal ? "#fff" : "var(--muted)", fontSize: 12, lineHeight: 1, padding: 0 }} title={galleriaVal ? "Visibile in galleria" : "Nascosto in galleria"}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: 12, height: 12 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                          </div>
                        );
                      })}
                      {pendingExtra.map((f, i) => (
                        <div key={`pending-${i}`} className="gallery-item" style={{ background: "var(--fg-soft)", position: "relative", display: "flex" }}>
                          <img src={URL.createObjectURL(f)} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          <button type="button" style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.5)", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center", fontSize: 14, lineHeight: 1 }} onClick={() => setPendingExtra((prev) => prev.filter((_, j) => j !== i))}>×</button>
                        </div>
                      ))}
                      <label className="gallery-upload" style={{ aspectRatio: 1, cursor: "pointer" }}>
                        <input type="file" multiple accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files) { setUploadError(null); const nonImage: string[] = []; const images: File[] = []; Array.from(e.target.files).forEach((f) => { if (f.type.startsWith("image/")) images.push(f); else nonImage.push(f.name); }); if (nonImage.length > 0) setUploadError(`File non supportati: ${nonImage.join(", ")}. Solo immagini.`); if (images.length > 0) setPendingExtra((prev) => [...prev, ...images]); } }} />
                        {IconPlus}<span>Aggiungi</span>
                      </label>
                    </div>
                  </div>
                )}
                {activeSubTab === "white" && (
                  <div
                    style={{ flex: 1, display: "flex", flexDirection: "column", ...(dragOver ? { outline: "2px dashed var(--accent)", outlineOffset: -2, borderRadius: "var(--radius)", padding: 16 } : { padding: 16 }) }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={(e) => { if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); setPendingImages((prev) => [...prev, ...Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"))]); }}
                  >
                    <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 14 }}>Foto del prodotto su sfondo bianco. Trascina le immagini qui o clicca per selezionarle.</p>
                    <div
                      className="gallery-compact"
                    >
                      {article.immagini.filter((i) => i.tipo === 'CARICATA' && !pendingDeleteImages.includes(i.id)).map((img) => (
                        <div key={img.id} className="gallery-item" style={{ background: "var(--fg-soft)", display: "flex", cursor: "pointer" }} onClick={() => setEditingImage(img.id)}>
                          <img src={img.url} alt="" draggable={false} style={imgStyle(img)} />
                        </div>
                      ))}
                      {pendingImages.map((f, i) => (
                        <div key={`pending-${i}`} className="gallery-item" style={{ background: "var(--fg-soft)", position: "relative", display: "flex" }}>
                          <img src={URL.createObjectURL(f)} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          <button
                            type="button"
                            style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.5)", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center", fontSize: 14, lineHeight: 1 }}
                            onClick={() => setPendingImages((prev) => prev.filter((_, j) => j !== i))}
                          >×</button>
                        </div>
                      ))}
                      <label className="gallery-upload" style={{ aspectRatio: 1, cursor: "pointer" }}>
                        <input type="file" multiple accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files) setPendingImages((prev) => [...prev, ...Array.from(e.target.files!)]); }} />
                        {IconPlus}<span>Aggiungi</span>
                      </label>
                    </div>
                  </div>
                )}
                {activeSubTab === "ai" && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16 }}>
                    <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 14 }}>Immagini ambientate generate da AI.</p>
                    <div className="gallery-compact">
                      {article.immagini.filter((i) => i.tipo === 'AI' && !pendingDeleteImages.includes(i.id)).map((img) => (
                        <div key={img.id} className="gallery-item" style={{ background: "var(--fg-soft)", display: "flex", cursor: "pointer" }} onClick={() => setEditingImage(img.id)}>
                          <img src={img.url} alt="" draggable={false} style={imgStyle(img)} />
                        </div>
                      ))}
                      <div className="gallery-upload" style={{ aspectRatio: 1 }}>
                        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}><path d="M12 1.5l2.47 6.53L21 10.5l-6.53 2.47L12 19.5l-2.47-6.53L3 10.5l6.53-2.47z"/></svg>
                        <span>Genera con AI</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "varianti" && (
              <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <p style={{ margin: "0 0 16px", flexShrink: 0, color: "var(--muted)", fontSize: 14 }}>Dati da Integra — sola lettura. Le modifiche vengono salvate solo al click su &quot;Salva Modifiche&quot;.</p>
                {(() => {
                  const vCols: Column<VarianteDetail>[] = [
                    { key: "codice", header: "Codice Integra", grow: true, cell: (v) => (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, whiteSpace: "nowrap" }}>{v.codice}</span>
                        <span className="info-trigger" data-tip={v.descrizione}>
                          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/><text x="8" y="11.5" textAnchor="middle" fontSize="10" fontWeight="600" fill="currentColor">i</text></svg>
                        </span>
                      </span>
                    )},
                    { key: "descrizione", header: "Descrizione", cell: (v) => (
                      <span className="desc-col" data-tip={v.descrizione}>{v.descrizione}</span>
                    )},
                    { key: "dim1", header: "Dim 1", width: "100px", cell: (v) => v.dimensioni ? Object.values(v.dimensioni).join(", ") : "—" },
                    { key: "multiplo", header: "Multiplo", width: "90px", mono: true, align: "right", cell: (v) => String(v.multiplo) },
                    { key: "giacenza", header: "Giacenza", width: "100px", mono: true, align: "right", cell: (v) => `${v.giacenza} pz` },
                    { key: "stato", header: "Stato", width: "110px", align: "center", cell: (v) => {
                      const s = editVarianti[v.codice] || v.stato;
                      return <span className={`status ${s === "attivo" ? "status-active" : "status-hidden"}`} style={{ fontSize: 10, padding: "2px 10px", minWidth: "auto" }}>{s}</span>;
                    }},
                  ];
                  const vActions: RowAction<VarianteDetail>[] = [
                    {
                      icon: (v) => {
                        const s = editVarianti[v.codice] || v.stato;
                        return s === "attivo" ? IconEyeOff : IconEye;
                      },
                      tooltip: (v) => {
                        const s = editVarianti[v.codice] || v.stato;
                        return s === "attivo" ? "Nascondi" : "Mostra";
                      },
                      onClick: (v) => setEditVarianti((prev) => {
                        const curr = prev[v.codice] || v.stato;
                        return { ...prev, [v.codice]: curr === "attivo" ? "nascosto" : "attivo" };
                      }),
                    },
                  ];
                  return (
                    <DataTable
                      columns={vCols}
                      rows={article.varianti}
                      rowKey={(v) => v.codice}
                      actions={vActions}
                      page={vPage}
                      pageSize={50}
                      total={article.varianti.length}
                      onPageChange={setVPage}
                      emptyText="Nessuna variante"
                    />
                  );
                })()}
              </div>
            )}

            {activeTab === "descrizione-ai" && (
              <div>
                <div className="ai-section">
                  <div className="ai-section-header">
                    <div className="ai-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5l2.47 6.53L21 10.5l-6.53 2.47L12 19.5l-2.47-6.53L3 10.5l6.53-2.47z"/></svg>
                    </div>
                    <div>
                      <h3>Creatore di Descrizione</h3>
                      <p>Descrivi il prodotto in linguaggio naturale. L&apos;AI genererà testo discorsivo, punti chiave e tag.</p>
                    </div>
                  </div>
                  <div className="field">
                    <label>Descrizione libera del prodotto</label>
                    <textarea className="textarea" placeholder="Es. Vaso alto in cotto terracotta…" />
                  </div>
                  <button className="btn btn-primary" disabled>
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}><path d="M12 1.5l2.47 6.53L21 10.5l-6.53 2.47L12 19.5l-2.47-6.53L3 10.5l6.53-2.47z"/></svg>
                    Genera Descrizione
                  </button>
                  <div className="ai-output empty" style={{ marginTop: 16 }}>La descrizione generata apparirà qui…</div>
                </div>
              </div>
            )}

            {activeTab === "famiglia" && (
              <div>
                <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: 14 }}>Famiglia principale da Integra, sola lettura.</p>
                <div className="readonly-field">
                  <div className="label">Famiglia principale</div>
                  <div className="value">{article.famiglia.nome}</div>
                </div>
                <div className="readonly-field">
                  <div className="label">Codice Famiglia</div>
                  <div className="value mono">{article.famiglia.codice}</div>
                </div>
              </div>
            )}

            {activeTab === "raccolte" && (
              <div>
                <h3 style={{ fontSize: 16, margin: "0 0 16px" }}>Raccolte associate</h3>
                <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 14 }}>Raccolte in sviluppo.</p>
                <div className="family-tags">
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>Nessuna raccolta</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="modal-root-footer">
        <button type="button" className="btn btn-danger-outline btn-sm" onClick={handleDelete} disabled={saving || !article}>Elimina</button>
        {article && !article.configurato && (
          <button type="button" className="btn btn-primary btn-sm" onClick={handleConfigura} disabled={saving || isDirty} title={isDirty ? "Salva prima le modifiche" : "Verifica i requisiti e marca l'articolo come configurato (irreversibile)"}>
            Imposta a configurato
          </button>
        )}
        {article?.configurato && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)" }}>
            <span className="user-status-dot attivo" /> Configurato
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleClose}>Annulla</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || !article || !isDirty}>
          {saving ? "Salvataggio…" : "Salva Modifiche"}
        </button>
      </div>
      <EditImageModal
        open={editingImage !== null}
        image={editingImage !== null && article ? (() => {
          const img = article.immagini.find((i) => i.id === editingImage);
          if (!img) return null;
          const d = immaginiDisplay[editingImage];
          return {
            id: editingImage,
            url: img.url,
            css: d?.css || img.css || "",
            tipo: img.tipo,
            inGalleria: immaginiGalleria?.[img.id] ?? img.inGalleria,
            copertina: img.copertina,
            ordinamento: img.ordinamento,
          };
        })() : null}
        onClose={() => setEditingImage(null)}
        codiceLinea={article?.codiceLinea ?? ""}
        onPersisted={() => { fetch(); }}
        onDeleteImage={(id) => { setPendingDeleteImages((prev) => [...prev, id]); setEditingImage(null); }}
        onResetImage={(id) => { setImmaginiDisplay((prev) => { const n = { ...prev }; delete n[id]; return n; }); setImmaginiGalleria((prev) => { if (!prev) return prev; const n = { ...prev }; delete n[id]; return n; }); setPendingDeleteImages((prev) => prev.filter((x) => x !== id)); }}
        onChange={(id, props) => {
          if ("css" in props) {
            setImmaginiDisplay((prev) => ({ ...prev, [id]: { css: props.css as string } }));
          }
          if ("inGalleria" in props) {
            setImmaginiGalleria((prev) => ({ ...(prev ?? {}), [id]: props.inGalleria as boolean }));
          }
          if ("copertina" in props && props.copertina === true) {
            setImmaginiOrdine((prev) => {
              const base = prev ?? (article ? article.immagini.sort((a, b) => a.ordinamento - b.ordinamento).map((i) => i.id) : []);
              const copy = base.filter((x) => x !== id);
              return [id, ...copy];
            });
          }
        }}
      />
    </Modal>
  );
}
