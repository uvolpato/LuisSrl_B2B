"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ModalSize = "sm" | "md" | "lg" | "full";

const INSET: Record<ModalSize, string> = {
  // 2 valori = "verticale orizzontale": piccolo sopra/sotto (piu' alta),
  // grande ai lati (piu' stretta).
  sm: "48px 18%",
  md: "80px",
  lg: "40px",
  full: "20px",
};

export default function Modal({
  open = true,
  size = "md",
  title,
  children,
  footer,
  noHeader,
  bodyClassName,
  maxWidth,
  onClose,
}: {
  open?: boolean;
  size?: ModalSize;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  noHeader?: boolean;
  bodyClassName?: string;
  /** Larghezza massima: rende la modale piccola e centrata (auth/form) invece di edge-to-edge. */
  maxWidth?: number;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-root-overlay"
      ref={overlayRef}
      onPointerDown={(e) => { if (e.target === overlayRef.current && e.button === 0) onClose(); }}
    >
      <div
        className={`modal-root${maxWidth ? " modal-root--small" : ""}`}
        onPointerDown={(e) => e.stopPropagation()}
        style={maxWidth
          ? { left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: `min(100% - 32px, ${maxWidth}px)`, maxHeight: "90vh" }
          : { inset: INSET[size] }}
      >
        {!noHeader && (
          <div className="modal-root-header">
            {title && <h2>{title}</h2>}
            <button className="modal-root-close" onClick={onClose} aria-label="Chiudi">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        {noHeader ? children : <div className={`modal-root-body${bodyClassName ? ` ${bodyClassName}` : ""}`}>{children}</div>}
        {footer && <div className="modal-root-footer">{footer}</div>}
      </div>
    </div>
  );
}
