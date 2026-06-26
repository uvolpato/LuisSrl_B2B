"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type ConfirmOptions = {
  message: ReactNode;
  title?: string;
  /** "danger" colora di rosso il bottone di conferma (azioni distruttive) */
  tone?: "default" | "danger";
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Sostituisce window.confirm: `if (await confirm({ message, tone }))`. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm deve stare dentro <ConfirmProvider>");
  return ctx;
}

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  }, []);

  // Esc = annulla
  useEffect(() => {
    if (!opts) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") settle(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [opts, settle]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        // dialog su misura (dimensionato sul contenuto, centrato) — usato SOLO per conferme/avvisi
        <div
          className="confirm-overlay"
          ref={overlayRef}
          onPointerDown={(e) => { if (e.target === overlayRef.current && e.button === 0) settle(false); }}
          role="dialog"
          aria-modal="true"
        >
          <div className="confirm-dialog" onPointerDown={(e) => e.stopPropagation()}>
            {opts.title && <h2 className="confirm-dialog-title">{opts.title}</h2>}
            <div className="confirm-dialog-message">{opts.message}</div>
            <div className="confirm-dialog-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => settle(false)}>
                {opts.cancelLabel ?? "Annulla"}
              </button>
              <button
                type="button"
                className={`btn btn-sm ${opts.tone === "danger" ? "btn-danger-outline" : "btn-primary"}`}
                onClick={() => settle(true)}
                autoFocus
              >
                {opts.confirmLabel ?? "Conferma"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
