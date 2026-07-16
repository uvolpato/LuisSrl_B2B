"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "../../lib/api";
import FocusTrap from "../common/FocusTrap";
import Notice from "../common/Notice";

const EyeIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
  </svg>
);

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "validation.password_min";
  if (!/[A-Za-z]/.test(pw)) return "validation.password_letter";
  if (!/[0-9]/.test(pw)) return "validation.password_digit";
  return null;
}

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
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
    setError(null);

    const pwErr = validatePassword(newPassword);
    if (pwErr) { setError(pwErr); return; }

    if (newPassword !== confirmPassword) {
      setError("validation.password_mismatch");
      return;
    }

    setBusy(true);
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
            {error && <Notice variant="error" onClose={() => setError(null)}>{tServer(error)}</Notice>}
            <label htmlFor="cp-old">Password attuale</label>
            <div style={{ position: "relative" }}>
              <input
                id="cp-old"
                type={showOld ? "text" : "password"} required autoComplete="current-password"
                value={oldPassword} onChange={(e) => setOldPassword(e.target.value)}
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", padding: 4,
                  color: "var(--muted)", lineHeight: 0,
                }}
                aria-label={showOld ? "Nascondi password" : "Mostra password"}
              >
                {showOld ? EyeOffIcon : EyeIcon}
              </button>
            </div>
            <label htmlFor="cp-new">Nuova password</label>
            <div style={{ position: "relative" }}>
              <input
                id="cp-new"
                type={showNew ? "text" : "password"} required autoComplete="new-password"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", padding: 4,
                  color: "var(--muted)", lineHeight: 0,
                }}
                aria-label={showNew ? "Nascondi password" : "Mostra password"}
              >
                {showNew ? EyeOffIcon : EyeIcon}
              </button>
            </div>
            <label htmlFor="cp-confirm">Conferma nuova password</label>
            <div style={{ position: "relative" }}>
              <input
                id="cp-confirm"
                type={showConfirm ? "text" : "password"} required autoComplete="new-password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", padding: 4,
                  color: "var(--muted)", lineHeight: 0,
                }}
                aria-label={showConfirm ? "Nascondi password" : "Mostra password"}
              >
                {showConfirm ? EyeOffIcon : EyeIcon}
              </button>
            </div>
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
