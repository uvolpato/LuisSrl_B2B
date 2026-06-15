"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ModalSize = "sm" | "md" | "lg";

const INSET: Record<ModalSize, string> = {
  sm: "120px",
  md: "80px",
  lg: "40px",
};

export default function Modal({
  open = true,
  size = "md",
  title,
  children,
  footer,
  noHeader,
  onClose,
}: {
  open?: boolean;
  size?: ModalSize;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  noHeader?: boolean;
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
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="modal-root" style={{ inset: INSET[size] }}>
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
        {noHeader ? children : <div className="modal-root-body">{children}</div>}
        {footer && <div className="modal-root-footer">{footer}</div>}
      </div>
    </div>
  );
}
