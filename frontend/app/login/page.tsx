"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api, ApiError, MeResponse, setCsrfToken } from "../../lib/api";

export default function LoginPage() {
  const t = useTranslations("login");
  const tServer = useTranslations("server");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<MeResponse>("/api/auth/login", {
        email,
        password,
      });
      setCsrfToken(res.csrfToken);
      router.replace(res.user.ruolo === "ADMIN" ? "/admin" : "/area");
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "errors.generic");
      setBusy(false);
    }
  }

  return (
    <div className="center-page">
      <form className="card" style={{ width: 380 }} onSubmit={onSubmit}>
        <span className="eyebrow">Luis S.r.l.</span>
        <h1 style={{ margin: "6px 0 2px" }}>{t("title")}</h1>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>{t("subtitle")}</p>

        {error && <div className="error-box">{tServer(error)}</div>}

        <label htmlFor="email">{t("email")}</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="password">{t("password")}</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="primary"
          style={{ width: "100%", marginTop: 20 }}
          disabled={busy}
        >
          {busy ? t("submitting") : t("submit")}
        </button>
      </form>
    </div>
  );
}
