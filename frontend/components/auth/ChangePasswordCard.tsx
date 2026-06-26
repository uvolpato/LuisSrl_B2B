"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "../../lib/api";
import Notice from "../common/Notice";

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

      {error && <Notice variant="error" onClose={() => setError(null)}>{tServer(error)}</Notice>}
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
