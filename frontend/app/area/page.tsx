"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/use-auth";
import Header from "../../components/Header";

export default function AreaClientePage() {
  const t = useTranslations("area");
  const tc = useTranslations("common");
  const { user, loading, setUser } = useAuth("CLIENTE");

  if (loading || !user) {
    return (
      <div className="center-page">
        <p style={{ color: "var(--muted)" }}>{tc("loading")}</p>
      </div>
    );
  }

  return (
    <>
      <Header user={user} />
      <main className="container" style={{ maxWidth: 640 }}>
        <h1>{t("title")}</h1>
        <p>{t("welcome", { name: user.nome })}</p>

        {user.mustChangePassword && (
          <div className="warn-box">{t("mustChange")}</div>
        )}

        {!user.mustChangePassword && (
          <div className="card" style={{ marginBottom: 20 }}>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              {t("catalogSoon")}
            </p>
          </div>
        )}

        <ChangePasswordCard
          onChanged={() => setUser({ ...user, mustChangePassword: false })}
        />
      </main>
    </>
  );
}

function ChangePasswordCard({ onChanged }: { onChanged: () => void }) {
  const t = useTranslations("area");
  const tc = useTranslations("common");
  const tServer = useTranslations("server");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);
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

      {error && <div className="error-box">{tServer(error)}</div>}
      {done && <div className="ok-box">{t("passwordChanged")}</div>}

      <label htmlFor="oldPassword">{t("oldPassword")}</label>
      <input
        id="oldPassword"
        type="password"
        autoComplete="current-password"
        required
        value={oldPassword}
        onChange={(e) => setOldPassword(e.target.value)}
      />

      <label htmlFor="newPassword">{t("newPassword")}</label>
      <input
        id="newPassword"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />

      <button className="primary" style={{ marginTop: 20 }} disabled={busy}>
        {busy ? tc("loading") : tc("save")}
      </button>
    </form>
  );
}
