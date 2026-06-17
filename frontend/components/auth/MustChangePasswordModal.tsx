"use client";

import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../lib/api";

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

export default function MustChangePasswordModal({
  oldPassword,
  userType,
  onClose,
}: {
  oldPassword: string;
  userType: "admin" | "customer";
  onClose: () => void;
}) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    if (newPassword !== confirmPassword) {
      setError("Le password non coincidono");
      return;
    }
    if (newPassword.length < 8) {
      setError("La password deve essere di almeno 8 caratteri");
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/auth/change-password", { oldPassword, newPassword });
      router.replace(userType === "admin" ? "/admin" : "/area");
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "errors.generic");
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
          <img src="/images/b2b/logo.webp" alt="Luis S.r.l." style={{ maxWidth: "100%", maxHeight: 48, width: "auto", height: "auto", marginBottom: 6 }} />
          <h2 style={{ margin: 0 }}>Cambio password richiesto</h2>
          <p style={{ color: "var(--muted)", marginTop: 0, marginBottom: 16 }}>
            Al primo accesso è necessario cambiare la password provvisoria.
          </p>
          <form onSubmit={onSubmit}>
            {error && <div className="error-box">{error}</div>}
            <label htmlFor="cp-new">Nuova password</label>
            <div style={{ position: "relative" }}>
              <input
                id="cp-new" type={showNew ? "text" : "password"} required autoComplete="new-password" minLength={8}
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
                id="cp-confirm" type={showConfirm ? "text" : "password"} required autoComplete="new-password" minLength={8}
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
            <button className="primary" style={{ marginTop: 16, width: "100%" }} disabled={busy}>
              {busy ? "Salvataggio..." : "Cambia password"}
            </button>
          </form>
          <div style={{ marginTop: 14, fontSize: 13, textAlign: "center" }}>
            <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, fontSize: 13, textDecoration: "underline" }}>
              Torna al login
            </button>
          </div>
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
