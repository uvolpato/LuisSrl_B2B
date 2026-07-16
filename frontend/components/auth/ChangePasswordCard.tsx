"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "../../lib/api";
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

/** Form di cambio password dell'utente corrente. */
export default function ChangePasswordCard({
  onChanged,
}: {
  onChanged: () => void;
}) {
  const t = useTranslations("area");
  const tc = useTranslations("common");
  const tServer = useTranslations("server");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);

    const pwErr = validatePassword(newPassword);
    if (pwErr) { setError(pwErr); return; }

    setBusy(true);
    try {
      await api.post("/api/auth/change-password", { oldPassword, newPassword });
      setDone(true);
      setOldPassword("");
      setNewPassword("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "errors.generic");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h2 style={{ marginTop: 0 }}>{t("changePassword")}</h2>

      {error && <Notice variant="error" onClose={() => setError(null)}>{tServer(error)}</Notice>}
      {done && <div className="ok-box">{t("passwordChanged")}</div>}

      <label htmlFor="oldPassword">{t("oldPassword")}</label>
      <div style={{ position: "relative" }}>
        <input
          id="oldPassword"
          type={showOld ? "text" : "password"}
          autoComplete="current-password"
          required
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
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

      <label htmlFor="newPassword">{t("newPassword")}</label>
      <div style={{ position: "relative" }}>
        <input
          id="newPassword"
          type={showNew ? "text" : "password"}
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
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

      <button className="primary" style={{ marginTop: 20 }} disabled={busy}>
        {busy ? tc("loading") : tc("save")}
      </button>
    </form>
  );
}
