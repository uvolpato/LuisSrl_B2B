"use client";

import { useState } from "react";
import Modal from "../../common/Modal";
import { api } from "../../../lib/api";
import type { StepTesto } from "./DescrizioneAiWizard";
import { STEPS } from "./DescrizioneAiWizard";

interface Props {
  codiceLinea: string;
  existingImages: { id: number; url: string; copertina: boolean; tipo: string }[];
  onClose: () => void;
  onAccept: (stepTesti: StepTesto[]) => void;
}

export default function AnalisiFotoModal({ codiceLinea, existingImages, onClose, onAccept }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(existingImages.map((i) => i.id)));
  const [result, setResult] = useState<{ stepTesti: StepTesto[]; immagini: { id: number; url: string }[] } | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [fullTextSteps, setFullTextSteps] = useState<Set<number>>(new Set());

  const frozen = analyzing || !!result;

  function toggleId(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleAnalyze() {
    const hasFiles = files.length > 0;
    const hasSelected = selectedIds.size > 0;
    if (!hasFiles && !hasSelected) { setError("Seleziona almeno una foto."); return; }
    setAnalyzing(true); setError(null); setResult(null);
    try {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      form.append('imageIds', [...selectedIds].join(','));
      const res = await api.post<{ stepTesti: StepTesto[]; raw: string; immagini: { id: number; url: string }[] }>(
        `/api/integrazione/articoli/${codiceLinea}/descrizione/analizza`, form,
      );
      console.log('[AnalisiFoto] raw JSON:', res.raw);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnalyzing(false);
    }
  }

  function handleAccept() {
    if (result?.stepTesti?.length) onAccept(result.stepTesti);
    onClose();
  }

  return (
    <Modal size="sm" title="Analisi AI da foto" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Upload area D&D */}
        <div
          onDragOver={frozen ? undefined : (e) => { e.preventDefault(); setDragOver(true); }}
          onDragEnter={frozen ? undefined : (e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={frozen ? undefined : (e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
          onDrop={frozen ? undefined : (e) => { e.preventDefault(); setDragOver(false); const fs = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/")); if (fs.length) setFiles((p) => [...p, ...fs]); }}
          onClick={frozen ? undefined : () => document.getElementById("analisi-foto-input")?.click()}
          style={{
            border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border)"}`,
            borderRadius: "var(--radius)", padding: 16, textAlign: "center",
            background: dragOver ? "var(--accent-soft)" : "var(--bg)",
            transition: "border-color .2s, background .2s",
            cursor: frozen ? "default" : "pointer",
            opacity: frozen ? 0.5 : 1,
            pointerEvents: frozen ? "none" as const : undefined,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 22, height: 22, color: "var(--accent)" }}>
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
          </svg>
          <span style={{ fontSize: 12, color: "var(--muted)", display: "block", marginTop: 4 }}>Trascina foto o clicca per caricarle</span>
        </div>
        <input id="analisi-foto-input" type="file" multiple accept="image/*" style={{ display: "none" }}
          disabled={frozen}
          onChange={(e) => { if (e.target.files) setFiles((p) => [...p, ...Array.from(e.target.files!)]); }}
        />

        {/* New uploads */}
        {files.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Caricate ora (selezionate):</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", opacity: frozen ? 0.5 : 1 }}>
              {files.map((f, i) => (
                <div key={i} style={{ position: "relative", width: 96, height: 96, borderRadius: 8, overflow: "hidden", border: "2px solid var(--accent)", flexShrink: 0 }}>
                  <img src={URL.createObjectURL(f)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                    disabled={frozen}
                    style={{ position: "absolute", top: 0, right: 0, width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.55)", color: "#fff", cursor: frozen ? "default" : "pointer", display: "grid", placeItems: "center", padding: 0, fontSize: 10, lineHeight: 1 }}
                  >✕</button>
                  <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "var(--accent)", color: "#fff", fontSize: 8, textAlign: "center", lineHeight: "14px" }}>✓</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing images */}
        {existingImages.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
              Foto articolo ({selectedIds.size}/{existingImages.length} selezionate — clicca per togglare):
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", opacity: frozen ? 0.5 : 1 }}>
              {existingImages.map((img) => {
                const sel = selectedIds.has(img.id);
                return (
                  <div key={img.id} onClick={frozen ? undefined : () => toggleId(img.id)}
                    style={{
                      position: "relative", width: 96, height: 96, borderRadius: 8, overflow: "hidden",
                      border: `2px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                      flexShrink: 0, cursor: frozen ? "default" : "pointer",
                      opacity: sel ? 1 : 0.45, transition: "opacity .15s, border-color .15s",
                    }}
                  >
                    <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    {sel && <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "var(--accent)", color: "#fff", fontSize: 8, textAlign: "center", lineHeight: "14px" }}>✓</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && <div style={{ color: "var(--danger)", fontSize: 12 }}>{error}</div>}

        {result ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Riepilogo dimensioni sensoriali (come nella descrizione generata) */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "12px" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>Riepilogo dimensioni sensoriali</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.stepTesti.map((s) => {
                  const isExpanded = expandedStep === s.step;
                  return (
                    <details key={s.step} style={{ background: "var(--fg-soft)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }} open={isExpanded} onToggle={() => setExpandedStep(isExpanded ? null : s.step)}>
                      <summary style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", cursor: "pointer", listStyle: "none" }}>
                        <span style={{ fontSize: 18 }}>{STEPS[s.step - 1]?.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ fontSize: 12, display: "block", marginBottom: 2 }}>{s.label}</strong>
                          <div style={{ fontSize: 13, letterSpacing: 2, color: "var(--accent)", lineHeight: 1 }}>
                            {"●".repeat(Math.min(Math.ceil(s.testo.length / 30), 6))}{"○".repeat(Math.max(6 - Math.min(Math.ceil(s.testo.length / 30), 6), 0))}
                          </div>
                          <span style={{ fontSize: 11, color: "var(--muted)", display: "block", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.testo.slice(0, 60)}{s.testo.length > 60 ? "…" : ""}</span>
                        </div>
                        <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: "auto" }}>{isExpanded ? "▲" : "▼"}</span>
                      </summary>
                      <div style={{ padding: "0 42px 10px 42px", borderTop: "1px solid var(--border)", fontSize: 13, lineHeight: 1.5, color: "var(--fg)" }}>
                        {(() => {
                          const isFull = fullTextSteps.has(s.step);
                          const preview = s.testo.slice(0, 200);
                          const hasMore = s.testo.length > 200;
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <span style={{ whiteSpace: isFull ? "pre-wrap" : "normal" }}>
                                {isFull ? s.testo : (hasMore ? preview + "…" : s.testo)}
                              </span>
                              {hasMore && (
                                <button
                                  type="button"
                                  style={{ alignSelf: "flex-start", fontSize: 11, color: "var(--accent)", background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setFullTextSteps((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(s.step)) next.delete(s.step); else next.add(s.step);
                                      return next;
                                    });
                                  }}
                                >
                                  {isFull ? "Mostra meno" : "Mostra tutto"}
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
            {/* Bottoni */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Annulla</button>
              <button className="btn btn-primary btn-sm" onClick={handleAccept}>
                Accetta e genera descrizione
              </button>
            </div>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={handleAnalyze}
            disabled={analyzing || (files.length === 0 && selectedIds.size === 0)}
            style={{ width: "100%" }}
          >
            {analyzing ? "Analisi in corso…" : "Analizza con AI"}
          </button>
        )}
      </div>
    </Modal>
  );
}
