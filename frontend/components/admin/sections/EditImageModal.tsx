"use client";

import { useEffect, useState } from "react";
import Modal from "../../common/Modal";
import { useConfirm } from "../../common/ConfirmProvider";

const FIT_OPTIONS = [
  { value: "cover", label: "Copri" },
  { value: "contain", label: "Contieni" },
  { value: "fill", label: "Riempì" },
  { value: "none", label: "Nessuno" },
  { value: "scale-down", label: "Adatta" },
];

interface EditImageModalProps {
  open: boolean;
  image: {
    id: number;
    url: string;
    css: string;
    tipo?: string;
    inGalleria?: boolean;
    copertina?: boolean;
    ordinamento?: number;
    prompt?: string;
  } | null;
  onClose: () => void;
  onChange: (id: number, props: Record<string, unknown>) => void;
  onDeleteImage?: (id: number) => void;
  onResetImage?: (id: number) => void;
}

type CssProps = { objectFit: string; objectPosition: string; zoom: number; rotation: number; posX: number; posY: number };

function parseCss(css: string): CssProps {
  const parts: Record<string, string> = {};
  css.split(";").filter(Boolean).forEach((p) => {
    const [k, v] = p.split(":");
    if (k && v) parts[k.trim()] = v.trim();
  });
  const fit = parts["object-fit"] || "cover";
  const pos = parts["object-position"] || "50% 50%";
  const t = parts.transform || "";
  const s = t.match(/scale\(([^)]+)\)/);
  const r = t.match(/rotate\(([^)]+)\)/);
  const zoom = s ? (parseFloat(s[1]) - 1) * 100 : 0;
  const rotation = r ? parseFloat(r[1]) : 0;
  const [posX, posY] = pos.split(/\s+/).map((v) => parseFloat(v));
  return { objectFit: fit, objectPosition: pos, zoom, rotation, posX: posX || 50, posY: posY || 50 };
}

function buildCss(fit: string, pos: string, zoom: number, rotation: number): string {
  const css = [`object-fit:${fit}`, `object-position:${pos}`];
  const tf: string[] = [];
  if (zoom !== 0) tf.push(`scale(${1 + zoom / 100})`);
  if (rotation !== 0) tf.push(`rotate(${rotation}deg)`);
  if (tf.length) css.push(`transform:${tf.join(" ")}`);
  return css.join(";");
}

function toPositionStr(x: number, y: number) {
  return `${Math.round(x)}% ${Math.round(y)}%`;
}

export default function EditImageModal({ open, image, onClose, onChange, onDeleteImage, onResetImage }: EditImageModalProps) {
  const [tab, setTab] = useState<"dettagli" | "posizionamento" | "ambienta-ai">("dettagli");
  const [editPrompt, setEditPrompt] = useState("");
  const confirm = useConfirm();
  useEffect(() => { setEditPrompt(image?.prompt || ""); }, [image?.id, image?.prompt]);
  if (!image) return null;
  // il narrowing della guard non si propaga nelle funzioni annidate sotto: alias non-null
  const img = image;

  const { objectFit, objectPosition, zoom, rotation, posX, posY } = parseCss(image.css);

  function handleChange(props: Record<string, unknown>) {
    const next = { ...parseCss(img.css) };
    if ("objectFit" in props) next.objectFit = props.objectFit as string;
    if ("objectPosition" in props) next.objectPosition = props.objectPosition as string;
    if ("zoom" in props) next.zoom = props.zoom as number;
    if ("rotation" in props) next.rotation = props.rotation as number;
    if ("posX" in props) next.posX = props.posX as number;
    if ("posY" in props) next.posY = props.posY as number;
    // objectPosition deriva sempre da posX/posY: i controlli di posizione
    // (slider X/Y, frecce, click sulla mappa) passano posX/posY, non objectPosition.
    next.objectPosition = toPositionStr(next.posX, next.posY);
    onChange(img.id, { css: buildCss(next.objectFit, next.objectPosition, next.zoom, next.rotation) });
  }

  function handleNudge(dx: number, dy: number) {
    handleChange({ posX: Math.max(0, Math.min(100, posX + dx)), posY: Math.max(0, Math.min(100, posY + dy)) });
  }

  function handleReset() {
    onChange(img.id, { css: "object-fit:cover;object-position:50% 50%" });
  }

  function handlePositionClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    handleChange({ posX: ((e.clientX - rect.left) / rect.width) * 100, posY: ((e.clientY - rect.top) / rect.height) * 100 });
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" noHeader>
      <div className="modal-root-header">
        <h2>Edit Immagine #{image.id}</h2>
        <button className="modal-root-close" onClick={onClose} aria-label="Chiudi">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>

      <div className="modal-body-edit" style={{ padding: "12px 20px", display: "flex", gap: 20 }}>
        <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8, alignSelf: "flex-start" }}>
          <div className="edit-image-pos-map" onClick={handlePositionClick} style={{ width: 320, height: 320, margin: 0 }}>
            <img src={image.url} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: objectFit as React.CSSProperties["objectFit"], objectPosition, transform: zoom !== 0 || rotation !== 0 ? `scale(${1 + zoom / 100}) rotate(${rotation}deg)` : undefined, pointerEvents: "none" }} />
            {tab === "posizionamento" && <div className="edit-image-pos-dot" style={{ left: `calc(${posX}% - 8px)`, top: `calc(${posY}% - 8px)` }} />}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)", textAlign: "center", lineHeight: 1.6 }}>
            {image.css && <div style={{ opacity: 0.7, fontSize: 10 }}>{image.css}</div>}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <button className={`subtab-btn ${tab === "dettagli" ? "active" : ""}`} onClick={() => setTab("dettagli")}>Dettagli</button>
            <button className={`subtab-btn ${tab === "posizionamento" ? "active" : ""}`} onClick={() => setTab("posizionamento")}>Posizionamento</button>
            {image.tipo === "CARICATA" && <button className={`subtab-btn ${tab === "ambienta-ai" ? "active" : ""}`} onClick={() => setTab("ambienta-ai")}>Ambienta AI</button>}
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {tab === "dettagli" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", alignContent: "start" }}>
                <div className="readonly-field" style={{ marginBottom: 0 }}>
                  <div className="label">ID</div>
                  <div className="value mono" style={{ fontSize: 13 }}>{image.id}</div>
                </div>
                <div className="readonly-field" style={{ marginBottom: 0 }}>
                  <div className="label">Ordinamento</div>
                  <div className="value mono" style={{ fontSize: 13 }}>{image.ordinamento ?? "—"}</div>
                </div>
                <div className="readonly-field" style={{ gridColumn: "1 / -1", marginBottom: 0 }}>
                  <div className="label">URL</div>
                  <div className="value" style={{ fontSize: 12, wordBreak: "break-all", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{image.url}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, gridColumn: "1 / -1", alignSelf: "start" }}>
                  <label style={{ margin: 0, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8, color: "var(--fg)", cursor: "pointer" }}>
                    <input type="checkbox" checked={image.copertina ?? false} onChange={(e) => handleChange({ copertina: e.target.checked })} style={{ width: "auto", margin: 0, padding: 0, flexShrink: 0 }} /> Copertina
                  </label>
                  <label style={{ margin: 0, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8, color: "var(--fg)", cursor: "pointer" }}>
                    <input type="checkbox" checked={image.inGalleria ?? true} onChange={(e) => handleChange({ inGalleria: e.target.checked })} style={{ width: "auto", margin: 0, padding: 0, flexShrink: 0 }} /> In galleria
                  </label>
                </div>
                {image.tipo === "AI" && (
                  <div className="field" style={{ gridColumn: "1 / -1", marginBottom: 0 }}>
                    <label style={{ fontSize: 12 }}>Prompt AI</label>
                    <textarea className="textarea" rows={2} value={editPrompt} onChange={(e) => { setEditPrompt(e.target.value); handleChange({ prompt: e.target.value }); }} style={{ fontSize: 13 }} />
                  </div>
                )}
              </div>
            )}

            {tab === "posizionamento" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12 }}>Adattamento</label>
                  <select className="input" style={{ width: "100%", padding: "6px 10px", fontSize: 13 }} value={objectFit} onChange={(e) => handleChange({ objectFit: e.target.value })}>
                    {FIT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="edit-image-arrow-pad" style={{ margin: "0 auto" }}>
                  <div /><button type="button" className="btn btn-secondary btn-sm" onClick={() => handleNudge(0, -10)} title="Su 10%"><svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M8 2l6 8H2z"/></svg></button><div />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleNudge(-10, 0)} title="Sinistra 10%"><svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M2 8l8-6v12z"/></svg></button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleReset} title="Centro" style={{ justifyContent: "center", background: "var(--accent-soft)", color: "var(--accent)", borderColor: "transparent" }}>
                    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><circle cx="8" cy="8" r="4" /></svg>
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleNudge(10, 0)} title="Destra 10%"><svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M14 8L6 2v12z"/></svg></button>
                  <div /><button type="button" className="btn btn-secondary btn-sm" onClick={() => handleNudge(0, 10)} title="Giù 10%"><svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M8 14l6-8H2z"/></svg></button><div />
                </div>
                <div className="edit-image-slider-row">
                  <span className="edit-image-slider-label">X</span>
                  <input type="range" min={0} max={100} value={posX} onChange={(e) => handleChange({ posX: Number(e.target.value) })} />
                  <span className="mono" style={{ width: 40, textAlign: "right", fontSize: 11 }}>{Math.round(posX)}%</span>
                </div>
                <div className="edit-image-slider-row">
                  <span className="edit-image-slider-label">Y</span>
                  <input type="range" min={0} max={100} value={posY} onChange={(e) => handleChange({ posY: Number(e.target.value) })} />
                  <span className="mono" style={{ width: 40, textAlign: "right", fontSize: 11 }}>{Math.round(posY)}%</span>
                </div>
                <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "4px 0" }} />
                <div className="edit-image-slider-row">
                  <span className="edit-image-slider-label" title="Zoom"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
                  <input type="range" min={-50} max={50} value={zoom} onChange={(e) => handleChange({ zoom: Number(e.target.value) })} />
                  <span className="mono" style={{ width: 40, textAlign: "right", fontSize: 11 }}>{zoom > 0 ? "+" : ""}{zoom}%</span>
                </div>
                <div className="edit-image-slider-row">
                  <span className="edit-image-slider-label" title="Rotazione"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 1 1-3-6.7L21 7"/><path d="M21 3v4h-4"/></svg></span>
                  <input type="range" min={-180} max={180} value={rotation} onChange={(e) => handleChange({ rotation: Number(e.target.value) })} />
                  <span className="mono" style={{ width: 40, textAlign: "right", fontSize: 11 }}>{rotation}°</span>
                </div>
              </div>
            )}

            {tab === "ambienta-ai" && (
              <div className="ai-section" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="ai-section-header">
                  <div className="ai-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5l2.47 6.53L21 10.5l-6.53 2.47L12 19.5l-2.47-6.53L3 10.5l6.53-2.47z"/></svg>
                  </div>
                  <div>
                    <h3>Generatore Immagini Ambientate</h3>
                    <p>Scrivi un prompt per generare un&apos;immagine del prodotto in contesto d&apos;uso.</p>
                  </div>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12 }}>Prompt di ambientazione</label>
                  <textarea className="textarea" placeholder="Es. Vaso su un tavolo in legno di una veranda mediterranea…" rows={3} />
                </div>
                <button className="btn btn-primary" disabled style={{ alignSelf: "flex-start" }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}><path d="M12 1.5l2.47 6.53L21 10.5l-6.53 2.47L12 19.5l-2.47-6.53L3 10.5l6.53-2.47z"/></svg>
                  Genera Immagine
                </button>
                <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ width: 140, height: 100, borderRadius: "var(--radius)", background: "var(--fg-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 12 }}>Anteprima 1</div>
                  <div style={{ width: 140, height: 100, borderRadius: "var(--radius)", background: "var(--fg-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 12 }}>Anteprima 2</div>
                  <div style={{ width: 140, height: 100, borderRadius: "var(--radius)", background: "var(--fg-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 12 }}>Anteprima 3</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="modal-root-footer">
        <button type="button" className="btn btn-danger-outline btn-sm" onClick={async () => { if (await confirm({ message: `Eliminare l'immagine #${img.id}?`, tone: "danger" })) onDeleteImage?.(img.id); }}>Elimina</button>
        <div style={{ flex: 1 }} />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onResetImage?.(image.id)}>Annulla modifiche</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Chiudi</button>
      </div>
    </Modal>
  );
}
