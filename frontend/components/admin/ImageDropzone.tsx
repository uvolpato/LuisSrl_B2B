"use client";

import { useState } from "react";

/** Dropzone immagine con anteprima, zoom e rimozione.
 *  Condivisa dai modali di modifica famiglia e raccolta: lo stato del file
 *  (pending/preview/url salvato) resta al genitore, qui solo la UI. */
export default function ImageDropzone({
  id, url, onFile, onRemove,
}: {
  /** id univoco per l'input file nascosto */
  id: string;
  /** URL da mostrare: anteprima locale o immagine gia' salvata; vuoto = placeholder */
  url: string;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);

  function handleFile(file: File | undefined) {
    if (file && file.type.startsWith("image/")) onFile(file);
  }

  return (
    <>
      <div
        className="dropzone"
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--accent)"; }}
        onDragLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
        onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--border)"; handleFile(e.dataTransfer.files[0]); }}
        onClick={() => document.getElementById(id)?.click()}
      >
        <input
          id={id}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
        />
        {url ? (
          <div style={{ position: "relative" }}>
            <img
              src={url}
              alt="Anteprima"
              style={{ width: "100%", maxHeight: 100, objectFit: "contain", borderRadius: "var(--radius)", display: "block", cursor: "pointer" }}
              onClick={(e) => { e.stopPropagation(); setZoomed(true); }}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 13, cursor: "pointer", lineHeight: 1 }}
              onClick={(e) => { e.stopPropagation(); setZoomed(true); }}
              title="Zoom"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 4 }}
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
            >
              Rimuovi immagine
            </button>
          </div>
        ) : (
          <div className="dropzone-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
            </svg>
            <span>Trascina un&apos;immagine qui o clicca per caricarla</span>
          </div>
        )}
      </div>
      {zoomed && url && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}
          onClick={() => setZoomed(false)}
        >
          <img src={url} alt="Ingrandimento" style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8 }} />
        </div>
      )}
    </>
  );
}
