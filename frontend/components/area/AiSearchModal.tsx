"use client";

import { useEffect, useRef, useState } from "react";

/** Modale "Ricerca intelligente" riutilizzabile (dashboard + catalogo).
 *  onSubmit riceve la query testuale. La ricerca per immagine/file è "in arrivo". */
export default function AiSearchModal({
  open,
  onClose,
  onSubmit,
  loading = false,
  error = null,
  initialQuery = "",
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (query: string) => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [imgNotice, setImgNotice] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQuery(initialQuery); setImgNotice(false); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open) return;
    // Durante la ricerca la modale è bloccata: niente chiusura con Esc.
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, loading]);

  const submit = () => { if (query.trim() && !loading) void onSubmit(query.trim()); };

  return (
    <div
      className={`aism-overlay${open ? " open" : ""}`}
      ref={overlayRef}
      onClick={(e) => { if (!loading && e.target === overlayRef.current) onClose(); }}
    >
      <style>{`
        .aism-overlay {
          display: none; position: fixed; inset: 0; z-index: 300;
          background: color-mix(in oklch, var(--fg) 40%, transparent);
          backdrop-filter: blur(4px);
          align-items: center; justify-content: center; padding: 24px;
        }
        .aism-overlay.open { display: flex; }
        .aism-modal {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 16px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto;
          box-shadow: 0 24px 64px color-mix(in oklch, var(--fg) 18%, transparent);
          animation: aismIn 0.18s ease-out;
        }
        @keyframes aismIn { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: none; } }
        .aism-head { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0; }
        .aism-head h3 { font-family: var(--font-display); font-size: 20px; margin: 0; display: flex; align-items: center; gap: 8px; }
        .aism-badge { font-family: var(--font-mono); font-size: 10px; letter-spacing: .04em; background: var(--accent-soft); color: var(--accent); padding: 3px 8px; border-radius: 999px; font-weight: 600; }
        .aism-close { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--muted); display: grid; place-items: center; cursor: pointer; padding: 0; line-height: 0; transition: background .12s, color .12s; }
        .aism-close:hover { background: var(--fg-soft, color-mix(in oklch, var(--fg) 6%, transparent)); color: var(--fg); }
        .aism-body { padding: 20px 24px 24px; }
        .aism-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--border); }
        .aism-desc { font-size: 14px; color: var(--muted); margin: 0 0 18px; }
        .aism-input-wrap { position: relative; margin-bottom: 14px; }
        .aism-input-wrap input { width: 100%; padding: 14px 16px 14px 44px; border: 1.5px solid var(--border); border-radius: var(--radius, 12px); background: var(--bg); font: inherit; font-size: 15px; color: var(--fg); transition: border-color .15s; }
        .aism-input-wrap input:focus { outline: none; border-color: var(--accent); }
        .aism-input-wrap input::placeholder { color: var(--muted); }
        .aism-input-wrap .aism-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; color: var(--muted); }
        .aism-upload-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .aism-upload-btn { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: center; padding: 10px 18px; border: 1.5px dashed var(--border); border-radius: var(--radius, 12px); background: transparent; font-size: 13px; font-weight: 500; color: var(--muted); cursor: pointer; transition: border-color .15s, color .15s, background .15s; position: relative; overflow: hidden; }
        .aism-upload-btn input[type="file"] { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
        .aism-upload-btn:hover { background: var(--fg); color: var(--surface); }
        .aism-hint { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 16px; font-size: 13px; color: var(--muted); }
        .aism-tag { display: inline-block; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--border); font-size: 11px; font-family: var(--font-mono); color: var(--muted); cursor: pointer; transition: border-color .12s, color .12s; background: none; }
        .aism-tag:hover { border-color: var(--accent); color: var(--accent); }
        .aism-note { margin: 14px 0 0; padding: 10px 14px; background: var(--accent-soft); border-radius: 8px; font-size: 13px; }
        .aism-error { margin: 14px 0 0; padding: 10px 14px; background: var(--danger-soft, #fde8e8); border-radius: 8px; font-size: 13px; }
        .aism-btn { border-radius: 8px; padding: 9px 20px; font-size: 14px; font-weight: 500; cursor: pointer; }
        .aism-btn-ghost { background: transparent; color: var(--muted); border: 1px solid var(--border); }
        .aism-btn-primary { background: var(--accent); color: #fff; border: 1px solid var(--accent); }
        .aism-btn-primary:disabled { opacity: .6; cursor: default; }
        .aism-modal { position: relative; }
        .aism-spin { animation: aismSpin .8s linear infinite; }
        @keyframes aismSpin { to { transform: rotate(360deg); } }
        .aism-loading { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; background: color-mix(in oklch, var(--surface) 78%, transparent); backdrop-filter: blur(1px); border-radius: 16px; }
        .aism-loading span { font-size: 14px; color: var(--muted); }
        @media (max-width: 600px) { .aism-upload-row { flex-direction: column; } .aism-modal { max-width: 100%; margin: 12px; border-radius: 12px; } }
      `}</style>

      <div className="aism-modal">
        <div className="aism-head">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--accent)" }}><path d="M12 1.5l2.47 6.53L21 10.5l-6.53 2.47L12 19.5l-2.47-6.53L3 10.5l6.53-2.47z" /></svg>
            Ricerca intelligente <span className="aism-badge">AI</span>
          </h3>
          <button className="aism-close" onClick={onClose} aria-label="Chiudi" disabled={loading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="aism-body">
          <p className="aism-desc">Descrivi a parole quello che cerchi e l&apos;AI troverà i prodotti più simili nel catalogo. La ricerca per immagine arriverà a breve.</p>
          <div className="aism-input-wrap">
            <svg className="aism-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Es. vaso terracotta rotondo Ø30 per esterno…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              disabled={loading}
            />
          </div>
          <div className="aism-upload-row">
            <label className="aism-upload-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
              <span>Carica un&apos;immagine</span><small>in arrivo</small>
              <input type="file" accept="image/*" onChange={() => setImgNotice(true)} />
            </label>
            <label className="aism-upload-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              <span>Carica un file</span><small>in arrivo</small>
              <input type="file" accept=".txt,.csv,.pdf,.doc,.docx" onChange={() => setImgNotice(true)} />
            </label>
          </div>
          <div className="aism-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
            Prova:
            <button className="aism-tag" onClick={() => setQuery("vaso alto per esterno resistente al gelo")} disabled={loading}>vaso alto per esterno</button>
            <button className="aism-tag" onClick={() => setQuery("fioriera rettangolare cotto color avana")} disabled={loading}>fioriera rettangolare</button>
            <button className="aism-tag" onClick={() => setQuery("cesto intrecciato per pianta da interno")} disabled={loading}>cesto da interno</button>
          </div>
          {imgNotice && <p className="aism-note">La ricerca per immagine sarà disponibile a breve.</p>}
          {error && <p className="aism-error">{error}</p>}
        </div>
        <div className="aism-foot">
          <button className="aism-btn aism-btn-ghost" onClick={onClose} disabled={loading}>Annulla</button>
          <button className="aism-btn aism-btn-primary" onClick={submit} disabled={loading || !query.trim()}>
            {loading ? "Cerco…" : "Cerca"}
          </button>
        </div>

        {loading && (
          <div className="aism-loading">
            <svg className="aism-spin" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 12a9 9 0 1 1-6.22-8.56" />
            </svg>
            <span>Ricerca in corso…</span>
          </div>
        )}
      </div>
    </div>
  );
}
