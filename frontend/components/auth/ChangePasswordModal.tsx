"use client";

import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError } from "../../lib/api";

export default function ChangePasswordModal({
  onChanged,
  onClose,
}: {
  onChanged: () => void;
  onClose: () => void;
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/auth/change-password", { oldPassword, newPassword });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "errors.generic");
    } finally {
      setBusy(false);
    }
  }

  return (
    <FocusTrap>
      <div
        ref={backdropRef}
        className="modal-backdrop"
        onPointerDown={(e) => { if (e.target === backdropRef.current && e.button === 0) onClose(); }}
        style={{ zIndex: 10000 }}
      >
        <div className="modal" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Cambio password">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Cambio password</h2>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)", padding: 0, lineHeight: 1 }}
              aria-label="Chiudi"
            >
              &times;
            </button>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "8px 0 16px" }}>
            Al primo accesso è necessario cambiare la password provvisoria.
          </p>
          <form onSubmit={onSubmit}>
            {error && <div className="error-box">{error}</div>}
            <label htmlFor="cp-old">Password attuale</label>
            <input
              id="cp-old"
              type="password" required autoComplete="current-password"
              value={oldPassword} onChange={(e) => setOldPassword(e.target.value)}
            />
            <label htmlFor="cp-new">Nuova password</label>
            <input
              id="cp-new"
              type="password" required autoComplete="new-password" minLength={8}
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button type="button" onClick={onClose}>Annulla</button>
              <button className="primary" disabled={busy}>
                {busy ? "Salvataggio..." : "Cambia password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </FocusTrap>
  );
}

function FocusTrap({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const focusable = (el: Element): el is HTMLElement =>
      el instanceof HTMLElement &&
      el.tabIndex >= 0 &&
      !el.hasAttribute("disabled");
    function trap(e: KeyboardEvent) {
      if (e.key !== "Tab" || !root) return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>("*")).filter(focusable);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, []);

  return <div ref={rootRef}>{children}</div>;
}
