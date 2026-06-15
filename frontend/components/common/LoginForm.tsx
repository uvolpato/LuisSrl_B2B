"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api, ApiError, setCsrfToken } from "../../lib/api";
import type { MeResponse } from "../../lib/types";

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

// Dev only — remove for production
const DEV_EMAIL = "admin@luissrl.it";
const DEV_PASSWORD = "LuisAdmin2026!";

function isDev(): boolean {
  if (typeof window === "undefined") return false;
  return process.env.NODE_ENV === "development" || window.location.hostname === "localhost";
}

export default function LoginForm() {
  const t = useTranslations("login");
  const tServer = useTranslations("server");
  const router = useRouter();
  const [email, setEmail] = useState(isDev() ? DEV_EMAIL : "");
  const [password, setPassword] = useState(isDev() ? DEV_PASSWORD : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<MeResponse>("/api/auth/login", {
        email,
        password,
        remember,
      });
      setCsrfToken(res.csrfToken);
      router.replace(res.user.ruolo === "ADMIN" ? "/admin" : "/area");
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "errors.generic");
      setBusy(false);
    }
  }

  return (
    <>
      <img src="/images/b2b/logo.webp" alt="Luis S.r.l." style={{ height: 28, width: "auto", marginBottom: 6 }} />
      <h2 style={{ margin: 0 }}>{t("title")}</h2>
      <p style={{ color: "var(--muted)", marginTop: 0, marginBottom: 16 }}>{t("subtitle")}</p>

      {forgot && (
        <div className="warn-box" style={{ fontSize: 13 }}>
          Per reimpostare la password, contatta Luis S.r.l. all&apos;indirizzo <strong>info@luisbg.it</strong> o chiama il <strong>+39 035 0521957</strong>.
        </div>
      )}

      {error && <div className="error-box">{tServer(error)}</div>}

      <form onSubmit={onSubmit}>
        <label htmlFor="login-email">{t("email")}</label>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="login-password">{t("password")}</label>
        <div style={{ position: "relative" }}>
          <input
            id="login-password"
            type={showPwd ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", padding: 4,
              color: "var(--muted)", lineHeight: 0,
            }}
            aria-label={showPwd ? "Nascondi password" : "Mostra password"}
          >
            {showPwd ? EyeOffIcon : EyeIcon}
          </button>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            style={{ width: "auto" }}
          />
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Ricordami (sessione 30 giorni)</span>
        </label>

        <button
          className="primary"
          style={{ width: "100%", marginTop: 14 }}
          disabled={busy}
        >
          {busy ? t("submitting") : t("submit")}
        </button>
      </form>

      <div style={{ marginTop: 16, fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
        <button
          type="button"
          onClick={() => setForgot(!forgot)}
          style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, fontSize: 13, textDecoration: "underline" }}
        >
          Ho dimenticato la password
        </button>
      </div>

      <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)", fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
        L&apos;accesso al portale è <strong>su invito</strong>.<br />
        Se sei un rivenditore e vuoi richiedere l&apos;accesso, scrivi a <a href="mailto:info@luisbg.it" style={{ color: "var(--accent)", textDecoration: "underline" }}>info@luisbg.it</a>.
      </div>
    </>
  );
}
