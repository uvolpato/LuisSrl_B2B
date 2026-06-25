"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "../../lib/api";
import FocusTrap from "../common/FocusTrap";

export default function ChangePasswordModal({
  onChanged,
  onClose,
  subtitle = "Inserisci la password attuale e scegline una nuova.",
}: {
  onChanged: () => void;
  onClose: () => void;
  subtitle?: string;
}) {
  const tServer = useTranslations("server");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    if (newPassword !== confirmPassword) {
      setError("validation.password_mismatch");
      return;
    }
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
            {subtitle}
          </p>
          <form onSubmit={onSubmit}>
            {error && <div className="error-box">{tServer(error)}</div>}
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
            <label htmlFor="cp-confirm">Conferma nuova password</label>
            <input
              id="cp-confirm"
              type="password" required autoComplete="new-password" minLength={8}
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
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
