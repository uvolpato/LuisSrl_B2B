"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../../../lib/api";
import Modal from "../../common/Modal";
import Notice from "../../common/Notice";
import { useConfirm } from "../../common/ConfirmProvider";
import Tooltip from "../../common/Tooltip";
import { IconPlus, IconEye, IconEyeOff } from "../icons";
import DataTable, { type Column, type RowAction } from "../DataTable";
import EditImageModal from "./EditImageModal";
import DescrizioneAiWizard from "./DescrizioneAiWizard";
import PositionedImage from "../../common/PositionedImage";
interface DimensioneEntry {
  codice?: string;
  descrizione?: string;
  valore?: string | number;
}
interface VarianteDetail {
  codice: string;
  descrizione: string;
  dimensioni?: Record<string, DimensioneEntry> | null;
  multiplo: number;
  giacenza: number;
  stato: string;
}

interface RaccoltaSlim {
  id: number;
  nome: string;
  slug: string;
  sconto: number | null;
  stato: string;
}

interface ArticoloDetail {
  id: string;
  codiceLinea: string;
  nome: string;
  colore: string;
  coloreRgb?: string;
  descrizione?: string | null;
  descrizioneDettagliata?: string | null;
  stato: "attivo" | "nascosto";
  configurato: boolean;
  famiglia: { codice: string; nome: string };
  variantiCount: number;
  updatedAt: string;
  raccolte: RaccoltaSlim[];
  varianti: VarianteDetail[];
  immagini: { id: number; url: string; ordinamento: number; copertina: boolean; tipo: string; inGalleria: boolean; css: string; prompt?: string | null; aiModel?: string | null; aiAspect?: string | null; aiTemperature?: number | null; aiSeed?: number | null; immaginePadreId?: number | null; aggiungiColore?: boolean; aggiungiVariante?: boolean; promptTemplateId?: number | null }[];
  wizardStepTesti?: { step: number; label: string; testo: string }[] | null;
  promptAi?: string | null;
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
  const initialDescRef = useRef({ descrizione: "", descrizioneDettagliata: "" });
  const initialStepTestiRef = useRef<ArticoloDetail["wizardStepTesti"]>(null);
  const initialPromptAiRef = useRef<string | null>(null);
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
  const [editMultipli, setEditMultipli] = useState<Record<string, number>>({});
  const [vPage, setVPage] = useState(1);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [immaginiOrdine, setImmaginiOrdine] = useState<number[] | null>(null);
  const [pendingExtra, setPendingExtra] = useState<File[]>([]);
  const [pendingAi, setPendingAi] = useState<File[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragGalleriaOver, setDragGalleriaOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [immaginiGalleria, setImmaginiGalleria] = useState<Record<number, boolean> | null>(null);
  const [immaginiDisplay, setImmaginiDisplay] = useState<Record<number, { css: string }>>({});
  const [pendingDeleteImages, setPendingDeleteImages] = useState<number[]>([]);
  const [editingImage, setEditingImage] = useState<number | null>(null);

  const [allRaccolte, setAllRaccolte] = useState<RaccoltaSlim[]>([]);
  const [selectedRaccoltaIds, setSelectedRaccoltaIds] = useState<Set<number>>(new Set());
  const [raccolteSearch, setRaccolteSearch] = useState("");
  const [dragRaccoltaId, setDragRaccoltaId] = useState<number | null>(null);

  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyStepTesti, setCopyStepTesti] = useState<{ step: number; label: string; testo: string }[]>([]);
  const [copySearchQuery, setCopySearchQuery] = useState("");
  const [copyArticleList, setCopyArticleList] = useState<{ articoloId: number; id: string; name: string; img: string | null }[]>([]);
  const [copyTargets, setCopyTargets] = useState<Set<string>>(new Set());
  const [copying, setCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!codiceLinea) return;
    setLoading(true);
    setError(null);
    try {
      const a = await api.get<ArticoloDetail>(`/api/integrazione/articoli/${codiceLinea}`);
      setArticle(a);
      initialDescRef.current = { descrizione: a.descrizione ?? "", descrizioneDettagliata: a.descrizioneDettagliata ?? "" };
      initialStepTestiRef.current = a.wizardStepTesti;
      initialPromptAiRef.current = a.promptAi ?? null;
      setEditNome(a.nome);
      setEditColore(a.colore);
      setEditColoreRgb(a.coloreRgb || "");
      setEditStato(a.stato);
      setEditVarianti(Object.fromEntries(a.varianti.map((v) => [v.codice, v.stato])));
      setEditMultipli(Object.fromEntries(a.varianti.map((v) => [v.codice, v.multiplo])));
      setVPage(1);
      setPendingImages([]);
      setImmaginiOrdine(null);
      setPendingExtra([]);
      setUploadError(null);
      setImmaginiGalleria(null);
      setImmaginiDisplay({});
      setPendingDeleteImages([]);
      setRaccolteSearch("");
    } catch (e) {
      console.error("[ArticoloEditModal fetch error]", e);
      setError(e instanceof Error ? e.message : "Errore caricamento articolo");
    } finally {
      setLoading(false);
    }
  }, [codiceLinea]);

  const fetchRaccolte = useCallback(async () => {
    try {
      const data = await api.get<RaccoltaSlim[]>("/api/admin/raccolte");
      setAllRaccolte(data);
    } catch { /* non bloccante */ }
  }, []);

  useEffect(() => {
    if (open && codiceLinea) {
      fetch();
      fetchRaccolte();
    } else {
      setActiveTab("generale");
    }
  }, [open, codiceLinea, fetch, fetchRaccolte]);

  useEffect(() => {
    if (article && allRaccolte.length > 0) {
      setSelectedRaccoltaIds(new Set(article.raccolte.map((r) => r.id)));
    }
  }, [article, allRaccolte]);

  const isDirty = useMemo(() => {
    if (!article) return false;
    if (editNome !== article.nome) return true;
    if (editColore !== article.colore) return true;
    if (editColoreRgb !== (article.coloreRgb || "")) return true;
    if (editStato !== article.stato) return true;
    if (pendingImages.length > 0 || pendingExtra.length > 0 || pendingAi.length > 0) return true;
    if (pendingDeleteImages.length > 0) return true;
    if (immaginiOrdine) return true;
    if (Object.keys(immaginiDisplay).length > 0) return true;
    for (const v of article.varianti) {
      if ((editVarianti[v.codice] || v.stato) !== v.stato) return true;
      if ((editMultipli[v.codice] ?? v.multiplo) !== v.multiplo) return true;
    }
    if ((article.descrizione ?? "") !== initialDescRef.current.descrizione) return true;
    if ((article.descrizioneDettagliata ?? "") !== initialDescRef.current.descrizioneDettagliata) return true;
    if (JSON.stringify(article.wizardStepTesti) !== JSON.stringify(initialStepTestiRef.current)) return true;
    if ((article.promptAi ?? null) !== initialPromptAiRef.current) return true;
    const origIds = new Set(article.raccolte.map((r) => r.id));
    if (origIds.size !== selectedRaccoltaIds.size) return true;
    for (const id of origIds) { if (!selectedRaccoltaIds.has(id)) return true; }
    return false;
  }, [article, editNome, editColore, editColoreRgb, editStato, editVarianti, editMultipli, immaginiOrdine, pendingImages, pendingExtra, pendingAi, pendingDeleteImages, immaginiGalleria, immaginiDisplay]);

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
      if (pendingAi.length > 0) {
        const form = new FormData();
        pendingAi.forEach((f) => form.append('files', f));
        form.append('tipo', 'AI');
        await api.post(`/api/integrazione/articoli/${article.codiceLinea}/immagini`, form);
      }
      const payload: Record<string, unknown> = { nome: editNome, colore: editColore, coloreRgb: editColoreRgb || null, stato: editStato, varianti: editVarianti, variantiMultipli: editMultipli, descrizione: article.descrizione, descrizioneDettagliata: article.descrizioneDettagliata, promptAi: article.promptAi };
      if (article.wizardStepTesti) payload.wizardStepTesti = article.wizardStepTesti;
      if (immaginiOrdine) payload.immaginiOrdine = immaginiOrdine;
      if (immaginiGalleria) payload.immaginiGalleria = immaginiGalleria;
      if (Object.keys(immaginiDisplay).length > 0) payload.immaginiDisplay = immaginiDisplay;
      if (pendingDeleteImages.length > 0) payload.immaginiDaEliminare = pendingDeleteImages;
      payload.raccolte = [...selectedRaccoltaIds];
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
                    <div className="color-field-container">
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
                    <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 14 }}>Tutte le immagini. Attiva/disattiva la visibilità in galleria. La prima immagine attiva è la copertina.</p>
                    {uploadError && <Notice variant="error" onClose={() => setUploadError(null)} style={{ marginBottom: 12 }}>{uploadError}</Notice>}
                    <div className="gallery-compact">
                      {(() => {
                      const displayIds = (immaginiOrdine ?? article.immagini.sort((a, b) => a.ordinamento - b.ordinamento).map((i) => i.id)).filter((id) => !pendingDeleteImages.includes(id));
                      // Copertina = prima immagine attiva (visibile in galleria)
                      const coverId = displayIds.find((id) => { const im = article.immagini.find((i) => i.id === id); return im ? (immaginiGalleria?.[id] ?? im.inGalleria) : false; });
                      return displayIds.map((id, idx) => {
                        const img = article.immagini.find((i) => i.id === id);
                        if (!img) return null;
                        const isDrag = dragIdx === idx;
                        const galleriaVal = immaginiGalleria?.[img.id] ?? img.inGalleria;
                        const desaturate = img.tipo === 'GALLERIA' && !galleriaVal;
                        return (
                          <PositionedImage
                            key={img.id}
                            className="gallery-item"
                            src={img.url}
                            css={immaginiDisplay[img.id]?.css || img.css}
                            aspect={1}
                            draggable
                            onClick={() => setEditingImage(img.id)}
                            onDragStart={(e) => { setDragIdx(idx); e.dataTransfer.setData('text/plain', ''); }}
                            onDragOver={(e) => { if (dragIdx === null) return; e.preventDefault(); if (dragIdx !== idx) { const list = immaginiOrdine ?? article.immagini.sort((a, b) => a.ordinamento - b.ordinamento).map((i) => i.id); const copy = [...list]; const [moved] = copy.splice(dragIdx, 1); copy.splice(idx, 0, moved); setImmaginiOrdine(copy); setDragIdx(idx); } }}
                            onDragEnd={() => setDragIdx(null)}
                            style={{ background: isDrag ? "var(--accent-soft)" : "var(--fg-soft)", opacity: isDrag ? 0.6 : 1, cursor: "grab" }}
                            imgStyle={desaturate ? { filter: "grayscale(1)" } : undefined}
                          >
                            {img.id === coverId && <span className="cover-badge">Copertina</span>}
                            <button type="button" onClick={() => setImmaginiGalleria((prev) => ({ ...prev ?? {}, [img.id]: !(prev?.[img.id] ?? img.inGalleria) }))} style={{ position: "absolute", bottom: 4, right: 4, width: 24, height: 24, borderRadius: "50%", border: `2px solid ${galleriaVal ? "var(--accent)" : "var(--muted)"}`, background: galleriaVal ? "var(--accent)" : "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: galleriaVal ? "#fff" : "var(--muted)", fontSize: 12, lineHeight: 1, padding: 0, flexShrink: 0 }} title={galleriaVal ? "Visibile in galleria" : "Nascosto in galleria"}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: 12, height: 12 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                          </PositionedImage>
                        );
                      });
                      })()}
                      {pendingExtra.map((f, i) => (
                        <div key={`pending-${i}`} className="gallery-item" style={{ background: "var(--fg-soft)", position: "relative", display: "flex" }}>
                          <img src={URL.createObjectURL(f)} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          <button type="button" style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.5)", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center", padding: 0, boxSizing: "border-box" }} onClick={() => setPendingExtra((prev) => prev.filter((_, j) => j !== i))}><svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>
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
                        <PositionedImage
                          key={img.id}
                          className="gallery-item"
                          src={img.url}
                          css={immaginiDisplay[img.id]?.css || img.css}
                          aspect={1}
                          style={{ background: "var(--fg-soft)", cursor: "pointer" }}
                          onClick={() => setEditingImage(img.id)}
                        />
                      ))}
                      {pendingImages.map((f, i) => (
                        <div key={`pending-${i}`} className="gallery-item" style={{ background: "var(--fg-soft)", position: "relative", display: "flex" }}>
                          <img src={URL.createObjectURL(f)} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          <button
                            type="button"
                            style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.5)", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center", padding: 0, boxSizing: "border-box" }}
                            onClick={() => setPendingImages((prev) => prev.filter((_, j) => j !== i))}
                          ><svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>
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
                    <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 14 }}>Immagini ambientate generate da AI. Puoi generarle o caricare immagini AI già pronte.</p>
                    {uploadError && <Notice variant="error" onClose={() => setUploadError(null)} style={{ marginBottom: 12 }}>{uploadError}</Notice>}
                    <div className="gallery-compact">
                      {article.immagini.filter((i) => i.tipo === 'AI' && !pendingDeleteImages.includes(i.id)).map((img) => (
                        <PositionedImage
                          key={img.id}
                          className="gallery-item"
                          src={img.url}
                          css={immaginiDisplay[img.id]?.css || img.css}
                          aspect={1}
                          style={{ background: "var(--fg-soft)", cursor: "pointer" }}
                          onClick={() => setEditingImage(img.id)}
                        />
                      ))}
                      {pendingAi.map((f, i) => (
                        <div key={`pending-ai-${i}`} className="gallery-item" style={{ background: "var(--fg-soft)", position: "relative", display: "flex" }}>
                          <img src={URL.createObjectURL(f)} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          <button type="button" style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.5)", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center", padding: 0, boxSizing: "border-box" }} onClick={() => setPendingAi((prev) => prev.filter((_, j) => j !== i))}><svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>
                        </div>
                      ))}
                      <label className="gallery-upload" style={{ aspectRatio: 1, cursor: "pointer" }}>
                        <input type="file" multiple accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files) { setUploadError(null); const nonImage: string[] = []; const images: File[] = []; Array.from(e.target.files).forEach((f) => { if (f.type.startsWith("image/")) images.push(f); else nonImage.push(f.name); }); if (nonImage.length > 0) setUploadError(`File non supportati: ${nonImage.join(", ")}. Solo immagini.`); if (images.length > 0) setPendingAi((prev) => [...prev, ...images]); } }} />
                        {IconPlus}<span>Carica AI</span>
                      </label>
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
                          <Tooltip text={v.descrizione}>
                            <span className="info-trigger">
                              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/><text x="8" y="11.5" textAnchor="middle" fontSize="10" fontWeight="600" fill="currentColor">i</text></svg>
                            </span>
                          </Tooltip>
                        </span>
                    )},
                    { key: "descrizione", header: "Descrizione", cell: (v) => (
                      <span className="desc-col" data-tip={v.descrizione}>{v.descrizione}</span>
                    )},
                    { key: "dim_diametro", header: "Diam. esterno", width: "90px", mono: true, align: "right", cell: (v) => {
                      const d = v.dimensioni?.diametro;
                      return d?.valore != null ? String(d.valore) : "—";
                    }},
                    { key: "dim_altezza", header: "Altezza", width: "80px", mono: true, align: "right", cell: (v) => {
                      const d = v.dimensioni?.altezza;
                      return d?.valore != null ? String(d.valore) : "—";
                    }},
                    { key: "multiplo", header: "Multiplo", width: "90px", mono: true, align: "right", cell: (v) => (
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="input"
                        value={String(editMultipli[v.codice] ?? v.multiplo)}
                        onChange={(e) => setEditMultipli((prev) => ({ ...prev, [v.codice]: Math.max(1, parseInt(e.target.value) || 1) }))}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: "70px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13, padding: "4px 8px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg)", color: "var(--fg)" }}
                      />
                    ) },
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
              <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <DescrizioneAiWizard
                  codiceLinea={article.codiceLinea}
                  immagini={article.immagini.filter((i) => !pendingDeleteImages.includes(i.id))}
                  descrizione={article.descrizione}
                  descrizioneDettagliata={article.descrizioneDettagliata}
                  initialStepTesti={article.wizardStepTesti}
                  promptAi={article.promptAi}
                  onSave={(descrizione, descrizioneDettagliata, stepTesti, promptAi) => {
                    setArticle((prev) => prev ? ({
                      ...prev,
                      ...(descrizione !== null ? { descrizione } : {}),
                      ...(descrizioneDettagliata !== null ? { descrizioneDettagliata } : {}),
                      ...(promptAi !== undefined ? { promptAi } : {}),
                      wizardStepTesti: stepTesti as ArticoloDetail["wizardStepTesti"],
                    }) : prev);
                  }}
                  onCopia={(stepTesti) => {
                    setCopyStepTesti(stepTesti);
                    setCopyTargets(new Set());
                    setCopySearchQuery("");
                    setCopySuccess(null);
                    setCopyError(null);
                    setCopyModalOpen(true);
                    api.get<{ articoloId: number; id: string; name: string; img: string | null }[]>("/api/integrazione/articoli").then((list) => {
                      setCopyArticleList(list.filter((a) => a.id !== article.codiceLinea));
                    }).catch(() => {});
                  }}
                />
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
              <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>
                <div className="admin-search" style={{ flexShrink: 0 }}>
                  <input
                    type="text"
                    placeholder="Cerca raccolta…"
                    value={raccolteSearch}
                    onChange={(e) => setRaccolteSearch(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
                  {/* Disponibili */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Disponibili</h4>
                    <div
                      style={{
                        flex: 1, overflow: "auto", border: "1px solid var(--border)",
                        borderRadius: "var(--radius)", padding: 8, background: "var(--bg)",
                      }}
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragRaccoltaId === null) return;
                        setSelectedRaccoltaIds((prev) => {
                          const next = new Set(prev);
                          next.delete(dragRaccoltaId);
                          return next;
                        });
                        setDragRaccoltaId(null);
                      }}
                    >
                      {(() => {
                        const q = raccolteSearch.toLowerCase();
                        const available = allRaccolte
                          .filter((r) => !selectedRaccoltaIds.has(r.id))
                          .filter((r) => !q || r.nome.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q));
                        if (available.length === 0) return <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: 20 }}>Nessuna raccolta disponibile</p>;
                        return (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {available.map((r) => (
                              <span
                                key={r.id}
                                draggable
                                onDragStart={(e) => { setDragRaccoltaId(r.id); e.dataTransfer.effectAllowed = "move"; }}
                                onDragEnd={() => setDragRaccoltaId(null)}
                                onClick={() => setSelectedRaccoltaIds((prev) => new Set(prev).add(r.id))}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 6,
                                  padding: "4px 12px", borderRadius: 999,
                                  background: "var(--fg-soft)", color: "var(--fg)",
                                  fontSize: 13, cursor: "pointer", userSelect: "none",
                                  border: "1px solid var(--border)",
                                  transition: "background 0.15s",
                                }}
                                title="Clicca per aggiungere o trascina"
                              >
                                {r.nome}
                                <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" style={{ opacity: 0.4 }}><path d="M8 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z"/></svg>
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  {/* Associate */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Associate ({selectedRaccoltaIds.size})
                    </h4>
                    <div
                      style={{
                        flex: 1, overflow: "auto", border: "1px solid var(--accent)",
                        borderRadius: "var(--radius)", padding: 8,
                        background: selectedRaccoltaIds.size > 0 ? "var(--accent-soft)" : "var(--bg)",
                        minHeight: 80,
                      }}
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragRaccoltaId === null) return;
                        setSelectedRaccoltaIds((prev) => new Set(prev).add(dragRaccoltaId));
                        setDragRaccoltaId(null);
                      }}
                    >
                      {selectedRaccoltaIds.size === 0 ? (
                        <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: 20 }}>
                          Trascina qui le raccolte o clicca su quelle disponibili
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {allRaccolte.filter((r) => selectedRaccoltaIds.has(r.id)).map((r) => (
                            <span
                              key={r.id}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                padding: "4px 12px", borderRadius: 999,
                                background: "var(--accent)", color: "#fff",
                                fontSize: 13, cursor: "pointer", userSelect: "none",
                                transition: "opacity 0.15s",
                              }}
                              onClick={() => setSelectedRaccoltaIds((prev) => {
                                const next = new Set(prev);
                                next.delete(r.id);
                                return next;
                              })}
                              title="Clicca per rimuovere"
                            >
                              {r.nome}
                              {r.sconto != null && <span style={{ fontSize: 11, opacity: 0.9 }}>-{r.sconto}%</span>}
                              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M4 4l8 8M12 4l-8 8" stroke="#fff" strokeWidth="1.5"/></svg>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
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
      {copyModalOpen && (
        <div className="modal-root-overlay" onPointerDown={(e) => { if (e.target === e.currentTarget && e.button === 0 && !copying) setCopyModalOpen(false); }}>
          <div className="modal-root" style={{ inset: "48px 18%" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-root-header">
              <h2>Copia osservazioni sensoriali</h2>
              <button className="modal-root-close" onClick={() => setCopyModalOpen(false)} disabled={copying} aria-label="Chiudi">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-body-edit">
              {copySuccess ? (
                <div style={{ padding: 24, textAlign: "center" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" style={{ width: 40, height: 40, margin: "0 auto 16px" }}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <p style={{ fontWeight: 600, marginBottom: 8 }}>Copiato con successo!</p>
                  <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>Le osservazioni sono state copiate su <strong>{copySuccess}</strong> articolo{copySuccess !== "1" ? "i" : ""}.</p>
                  <button className="btn btn-primary" onClick={() => setCopyModalOpen(false)}>Chiudi</button>
                </div>
              ) : (
                <>
                  <div className="notice notice-info" style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--muted)" }}>
                      Le osservazioni sensoriali verranno copiate sull'articolo selezionato. L'AI rigenererà la descrizione in base alle caratteristiche specifiche dell'articolo di destinazione (colore, immagini, ecc.) — non verrà copiata la descrizione esistente.
                    </p>
                  </div>
                  <div className="field" style={{ marginBottom: 16 }}>
                    <label>Cerca articolo</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Digita nome o codice articolo…"
                      value={copySearchQuery}
                      onChange={(e) => { setCopySearchQuery(e.target.value); }}
                      autoFocus
                    />
                  </div>
                  <div style={{ maxHeight: 300, overflow: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                    {copyArticleList
                      .filter((a) => !copySearchQuery || a.name.toLowerCase().includes(copySearchQuery.toLowerCase()) || a.id.toLowerCase().includes(copySearchQuery.toLowerCase()))
                      .map((a) => {
                        const selected = copyTargets.has(a.id);
                        return (
                        <div
                          key={a.id}
                          onClick={() => {
                            const next = new Set(copyTargets);
                            if (selected) next.delete(a.id); else next.add(a.id);
                            setCopyTargets(next);
                          }}
                          style={{
                            display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer",
                            background: selected ? "var(--accent-soft)" : "transparent",
                            borderBottom: "1px solid var(--border)", transition: "background 0.15s",
                          }}
                        >
                          <span style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${selected ? "var(--accent)" : "var(--muted)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: selected ? "var(--accent)" : "transparent" }}>
                            {selected && <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" style={{ width: 12, height: 12 }}><polyline points="20 6 9 17 4 12"/></svg>}
                          </span>
                          {a.img ? (
                            <img src={a.img} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: 6, background: "var(--fg-soft)", flexShrink: 0 }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 500, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                            <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>{a.id}</div>
                          </div>
                        </div>
                        );
                      })}
                    {copyArticleList.length === 0 && (
                      <p style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Caricamento articoli…</p>
                    )}
                  </div>
                  {copyError && <p style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>{copyError}</p>}
                </>
              )}
            </div>
            {!copySuccess && (
              <div className="modal-root-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setCopyModalOpen(false)} disabled={copying}>Annulla</button>
                <div style={{ flex: 1 }} />
                <button
                  className="btn btn-primary btn-sm"
                  disabled={copyTargets.size === 0 || copying}
                  onClick={async () => {
                    if (copyTargets.size === 0 || !article) return;
                    setCopying(true);
                    setCopyError(null);
                    let ok = 0;
                    let fail = 0;
                    const targets = [...copyTargets];
                    try {
                      const savePayload: Record<string, unknown> = {
                        descrizione: article.descrizione,
                        descrizioneDettagliata: article.descrizioneDettagliata,
                        wizardStepTesti: copyStepTesti,
                        promptAi: article.promptAi,
                      };
                      await api.put(`/api/integrazione/articoli/${article.codiceLinea}`, savePayload);
                      for (const target of targets) {
                        try {
                          await api.put(`/api/integrazione/articoli/${target}`, { wizardStepTesti: copyStepTesti });
                          const wizardResult = await api.post<{ descrizioneDettagliata: string; descrizioneBreve: string }>(`/api/integrazione/articoli/${target}/descrizione/wizard`, { stepTesti: copyStepTesti, azione: "genera" });
                          await api.put(`/api/integrazione/articoli/${target}`, {
                            descrizione: wizardResult.descrizioneBreve,
                            descrizioneDettagliata: wizardResult.descrizioneDettagliata,
                          });
                          ok++;
                        } catch {
                          fail++;
                        }
                      }
                      setCopySuccess(String(ok));
                      if (fail > 0) setCopyError(`${fail} articolo/i non riuscito/i.`);
                    } catch (e) {
                      setCopyError(String(e));
                    } finally {
                      setCopying(false);
                    }
                  }}
                >
                  {copying ? "Copia in corso…" : `Conferma copia (${copyTargets.size})`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <EditImageModal
        open={editingImage !== null}
        image={editingImage !== null && article ? (() => {
          const img = article.immagini.find((i) => i.id === editingImage);
          if (!img) return null;
          const d = immaginiDisplay[editingImage];
          const padre = img.immaginePadreId ? article.immagini.find((p) => p.id === img.immaginePadreId) : null;
          return {
            id: editingImage,
            url: img.url,
            css: d?.css || img.css || "",
            tipo: img.tipo,
            inGalleria: immaginiGalleria?.[img.id] ?? img.inGalleria,
            copertina: img.copertina,
            ordinamento: img.ordinamento,
            prompt: img.prompt ?? null,
            aiModel: img.aiModel ?? null,
            aiAspect: img.aiAspect ?? null,
            aiTemperature: img.aiTemperature ?? null,
            aiSeed: img.aiSeed ?? null,
            immaginePadreId: img.immaginePadreId ?? null,
            immaginePadreUrl: padre?.url ?? null,
            aggiungiColore: img.aggiungiColore,
            aggiungiVariante: img.aggiungiVariante,
            promptTemplateId: img.promptTemplateId ?? null,
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
