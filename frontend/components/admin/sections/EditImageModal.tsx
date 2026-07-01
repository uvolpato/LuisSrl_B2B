"use client";

import { useEffect, useState } from "react";
import Modal from "../../common/Modal";
import { useConfirm } from "../../common/ConfirmProvider";
import Notice from "../../common/Notice";
import { api, ApiError } from "../../../lib/api";

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
    prompt?: string | null;
    aiModel?: string | null;
    aiAspect?: string | null;
    aiTemperature?: number | null;
    aiSeed?: number | null;
    immaginePadreId?: number | null;
    immaginePadreUrl?: string | null;
  } | null;
  onClose: () => void;
  onChange: (id: number, props: Record<string, unknown>) => void;
  onDeleteImage?: (id: number) => void;
  onResetImage?: (id: number) => void;
  codiceLinea: string;
  onPersisted?: () => void;
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

const INFO: Record<string, { title: string; lines: string[] }> = {
  n: {
    title: "N. immagini",
    lines: [
      "Quante varianti ambientate generare in un colpo solo (1–4).",
      "Il costo API si moltiplica per il numero scelto: 3 immagini costano 3× la singola generazione.",
      "Esempio: se vuoi scegliere tra più opzioni, usa 3–4 immagini. Se hai già un'idea chiara, 1–2 bastano.",
    ],
  },
  aspect: {
    title: "Proporzioni",
    lines: [
      "Il formato (rapporto larghezza/altezza) dell'immagine generata.",
      "1:1 = quadrato — ideale per galleria prodotto e miniature.",
      "4:3 = classico orizzontale — buon compromesso per contesto d'uso.",
      "16:9 = panoramica — perfetto per hero banner o sfondi.",
      "3:4, 9:16 = formati verticali — per mobile o storytelling.",
      "Scegli in base a dove userai l'immagine: galleria, scheda prodotto, banner.",
    ],
  },
  temp: {
    title: "Creatività (temperature)",
    lines: [
      "Controlla quanto l'AI si discosta dal prompt che hai scritto.",
      "0.0 = identico al prompt, risultati prevedibili e conservativi.",
      "1.0 = massima libertà, risultati sorprendenti ma meno controllabili.",
      "Consigliato: 0.6–0.8 per un buon equilibrio tra fedeltà al prompt e varietà creativa.",
      "Esempio: prompt «vaso su tavolo in legno, luce naturale». Con 0.3 avrai una foto realistica. Con 0.9 l'AI potrebbe reinterpretare lo stile, i colori o l'ambiente.",
    ],
  },
  seed: {
    title: "Seed (seme casuale)",
    lines: [
      "Un numero fisso che rende il risultato riproducibile.",
      "Stesso prompt + stessi parametri + stesso seed = stessa identica immagine.",
      "Utile se hai trovato un'immagine che funziona e vuoi rigenerarla con piccole variazioni (es. cambiando il prompt ma tenendo lo stesso seed per coerenza).",
      "Lascia vuoto per ottenere variazioni casuali ogni volta.",
      "Esempio: prompt «vaso in giardino mediterraneo», seed=42. Se ti piace, puoi rifarlo con seed=42 e «vaso in giardino giapponese» per mantenere coerenza compositiva.",
    ],
  },
};

const InfoIcon = ({ id, onClick, className }: { id: string; onClick: (id: string) => void; className?: string }) => (
  <span onClick={(e) => { e.stopPropagation(); onClick(id); }} className={className} style={{ cursor: "pointer", display: "inline-flex", verticalAlign: "middle" }}>
    <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ opacity: 0.5 }}>
      <circle cx="7" cy="7" r="6" /><line x1="7" y1="6" x2="7" y2="10" /><line x1="7" y1="4.5" x2="7" y2="4.5" strokeWidth={2} strokeLinecap="round" />
    </svg>
  </span>
);

export default function EditImageModal({ open, image, onClose, onChange, onDeleteImage, onResetImage, codiceLinea, onPersisted }: EditImageModalProps) {
  const [tab, setTab] = useState<"dettagli" | "posizionamento" | "ambienta-ai" | "ai-params">("dettagli");
  const [editPrompt, setEditPrompt] = useState("");
  const confirm = useConfirm();
  // Stato generatore AI ("ambienta")
  const [aiPrompt, setAiPrompt] = useState("Genera in un ambiente lussuoso ma di classe");
  const [aiN, setAiN] = useState(1);
  const [aiAspect, setAiAspect] = useState("1:1");
  const [aiTemp, setAiTemp] = useState(0.7);
  const [aiSeed, setAiSeed] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiResults, setAiResults] = useState<{ mime: string; b64: string }[]>([]);
  const [aiGenId, setAiGenId] = useState<string | null>(null);
  const [aiSelected, setAiSelected] = useState<Set<number>>(new Set());
  const [aiError, setAiError] = useState<string | null>(null);
  const [persisting, setPersisting] = useState(false);
  const [aiSaved, setAiSaved] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState<string | null>(null);
  useEffect(() => { setEditPrompt(image?.prompt || ""); }, [image?.id, image?.prompt]);
  // tab di default in base al tipo (evita tab "morto" cambiando immagine)
  useEffect(() => { if (image) setTab(image.tipo === "AI" ? "ai-params" : "dettagli"); }, [image?.id, image?.tipo]);
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

  async function handleGenera() {
    if (!aiPrompt.trim()) { setAiError("Inserisci un prompt."); return; }
    setGenerating(true); setAiError(null); setAiSaved(null);
    try {
      const res = await api.post<{ generationId: string; images: { mime: string; b64: string }[] }>(
        `/api/integrazione/articoli/${codiceLinea}/immagini/${img.id}/ambienta`,
        { prompt: aiPrompt, n: aiN, aspectRatio: aiAspect, temperature: aiTemp, seed: aiSeed.trim() === "" ? undefined : Number(aiSeed) },
      );
      setAiGenId(res.generationId);
      setAiResults(res.images);
      setAiSelected(new Set());
    } catch (e) {
      setAiError(e instanceof ApiError ? e.code : "Errore di generazione.");
    } finally { setGenerating(false); }
  }

  function toggleSel(i: number) {
    setAiSelected((prev) => { const s = new Set(prev); if (s.has(i)) s.delete(i); else s.add(i); return s; });
  }
  function selAll() {
    setAiSelected((prev) => (prev.size === aiResults.length ? new Set() : new Set(aiResults.map((_, i) => i))));
  }

  async function handlePersist() {
    if (!aiGenId || aiSelected.size === 0) return;
    setPersisting(true); setAiError(null);
    try {
      const res = await api.post<{ saved: number }>(
        `/api/integrazione/articoli/${codiceLinea}/immagini/ai/persisti`,
        { generationId: aiGenId, indices: [...aiSelected] },
      );
      onPersisted?.();
      setAiResults([]); setAiSelected(new Set()); setAiGenId(null);
      setAiSaved(`${res.saved} immagine/i salvate nella galleria AI.`);
    } catch (e) {
      setAiError(e instanceof ApiError ? e.code : "Errore di salvataggio.");
    } finally { setPersisting(false); }
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
            {image.tipo === "AI" && <button className={`subtab-btn ${tab === "ai-params" ? "active" : ""}`} onClick={() => setTab("ai-params")}>AI</button>}
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {tab === "ai-params" && image.tipo === "AI" && (
              <div className="ai-section" style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0, overflow: "auto" }}>
                <div className="ai-section-header">
                  <div className="ai-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5l2.47 6.53L21 10.5l-6.53 2.47L12 19.5l-2.47-6.53L3 10.5l6.53-2.47z"/></svg>
                  </div>
                  <div>
                    <h3>Parametri di generazione</h3>
                    <p>Sola lettura — i valori con cui questa immagine è stata generata.</p>
                  </div>
                </div>
                <div className="readonly-field">
                  <div className="label">Prompt</div>
                  <div className="value" style={{ whiteSpace: "pre-wrap" }}>{image.prompt || "—"}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px 16px" }}>
                  <div className="readonly-field"><div className="label">Modello</div><div className="value mono">{image.aiModel || "—"}</div></div>
                  <div className="readonly-field"><div className="label">Proporzioni</div><div className="value mono">{image.aiAspect || "—"}</div></div>
                  <div className="readonly-field"><div className="label">Temperatura</div><div className="value mono">{image.aiTemperature ?? "—"}</div></div>
                  <div className="readonly-field"><div className="label">Seed</div><div className="value mono">{image.aiSeed ?? "casuale"}</div></div>
                </div>
                {image.immaginePadreUrl && (
                  <div>
                    <div className="label" style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Immagine di origine{image.immaginePadreId ? ` (#${image.immaginePadreId})` : ""}</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.immaginePadreUrl} alt="" onClick={() => setLightbox(image.immaginePadreUrl!)} style={{ width: 150, height: 150, objectFit: "cover", borderRadius: "var(--radius)", cursor: "zoom-in", border: "1px solid var(--border)" }} />
                  </div>
                )}
              </div>
            )}
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
              <div className="ai-section" style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0, overflow: "auto" }}>
                <div className="ai-section-header">
                  <div className="ai-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5l2.47 6.53L21 10.5l-6.53 2.47L12 19.5l-2.47-6.53L3 10.5l6.53-2.47z"/></svg>
                  </div>
                  <div>
                    <h3>Generatore Immagini Ambientate</h3>
                    <p>L&apos;immagine viene inviata a Nano Banana (Gemini) col prompt per ambientarla in un contesto d&apos;uso.</p>
                  </div>
                </div>

                {aiError && <Notice variant="error" onClose={() => setAiError(null)}>{aiError}</Notice>}
                {aiSaved && <Notice variant="success" onClose={() => setAiSaved(null)}>{aiSaved}</Notice>}

                <div className="field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12 }}>Prompt di ambientazione</label>
                  <textarea className="textarea" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Es. Vaso su un tavolo in legno di una veranda mediterranea, luce calda del tramonto…" rows={3} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px 16px" }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 12 }}>N. immagini <InfoIcon id="n" onClick={setInfoOpen} /></label>
                    <select className="input" value={aiN} onChange={(e) => setAiN(Number(e.target.value))}>
                      {[1, 2, 3, 4].map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 12 }}>Proporzioni <InfoIcon id="aspect" onClick={setInfoOpen} /></label>
                    <select className="input" value={aiAspect} onChange={(e) => setAiAspect(e.target.value)}>
                      {["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3"].map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 12 }}>Creatività ({aiTemp.toFixed(2)}) <InfoIcon id="temp" onClick={setInfoOpen} /></label>
                    <input type="range" min={0} max={1} step={0.05} value={aiTemp} onChange={(e) => setAiTemp(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 12 }}>Seed (opz.) <InfoIcon id="seed" onClick={setInfoOpen} /></label>
                    <input className="input" type="number" value={aiSeed} onChange={(e) => setAiSeed(e.target.value)} placeholder="casuale" />
                  </div>
                </div>

                <button className="btn btn-primary" onClick={handleGenera} disabled={generating || !aiPrompt.trim()} style={{ alignSelf: "flex-start" }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}><path d="M12 1.5l2.47 6.53L21 10.5l-6.53 2.47L12 19.5l-2.47-6.53L3 10.5l6.53-2.47z"/></svg>
                  {generating ? "Generazione…" : "Genera Immagine"}
                </button>

                {aiResults.length > 0 && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>Clicca per selezionare, lente per ingrandire.</span>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={selAll}>
                        {aiSelected.size === aiResults.length ? "Deseleziona tutte" : "Seleziona tutte"}
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
                      {aiResults.map((im, i) => {
                        const sel = aiSelected.has(i);
                        const url = `data:${im.mime};base64,${im.b64}`;
                        return (
                          <div key={i} onClick={() => toggleSel(i)} style={{ position: "relative", aspectRatio: 1, borderRadius: "var(--radius)", overflow: "hidden", cursor: "pointer", border: `2px solid ${sel ? "var(--accent)" : "transparent"}` }}>
                            <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            {sel && (
                              <div style={{ position: "absolute", top: 4, left: 4, width: 20, height: 20, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "grid", placeItems: "center" }}>
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                              </div>
                            )}
                            <button type="button" onClick={(e) => { e.stopPropagation(); setLightbox(url); }} title="Ingrandisci" style={{ position: "absolute", bottom: 4, right: 4, width: 24, height: 24, borderRadius: 6, border: "none", background: "rgba(0,0,0,0.55)", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center" }}>
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <button className="btn btn-primary" onClick={handlePersist} disabled={persisting || aiSelected.size === 0} style={{ alignSelf: "flex-start" }}>
                      {persisting ? "Salvataggio…" : `Salva selezionate (${aiSelected.size})`}
                    </button>
                  </>
                )}
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

      {infoOpen && INFO[infoOpen] && (
        <div onClick={() => setInfoOpen(null)} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 24px", maxWidth: 480, width: "100%", boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>{INFO[infoOpen].title}</h3>
            {INFO[infoOpen].lines.map((line, i) => <p key={i} style={{ margin: "0 0 8px", fontSize: 13, lineHeight: 1.55, color: "var(--fg)" }}>{line}</p>)}
            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setInfoOpen(null)}>Chiudi</button>
            </div>
          </div>
        </div>
      )}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, cursor: "zoom-out" }}>
          <img src={lightbox} alt="" style={{ maxWidth: "92%", maxHeight: "92%", borderRadius: "var(--radius)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} />
        </div>
      )}
    </Modal>
  );
}
