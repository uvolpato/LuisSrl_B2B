"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "../../lib/api";
import type {
  ProvisionalPasswordResponse,
  UserListResponse,
  UserProfile,
} from "../../lib/types";
import { useAuth } from "../../lib/use-auth";
import Header from "../../components/common/Header";
import LoadingScreen from "../../components/common/LoadingScreen";
import UserTable from "../../components/users/UserTable";
import UserEditorModal, {
  UserEditorTarget,
} from "../../components/users/UserEditorModal";
import ProvisionalPasswordModal from "../../components/users/ProvisionalPasswordModal";

export default function AdminPage() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const tServer = useTranslations("server");
  const { user: admin, loading } = useAuth("ADMIN");

  const [items, setItems] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [stato, setStato] = useState<"" | "ATTIVO" | "BLOCCATO">("");
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<UserEditorTarget | null>(null);
  const [provisional, setProvisional] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const reload = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (stato) params.set("stato", stato);
    const res = await api.get<UserListResponse>(`/api/users?${params}`);
    setItems(res.items);
    setTotal(res.total);
  }, [q, stato]);

  useEffect(() => {
    if (!loading) {
      reload().catch(() => setError("errors.generic"));
    }
  }, [loading, reload]);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "errors.generic");
    }
  }

  function onBlockToggle(u: UserProfile) {
    if (u.stato === "ATTIVO" && !window.confirm(t("confirmBlock"))) return;
    void run(async () => {
      await api.post(
        `/api/users/${u.id}/${u.stato === "ATTIVO" ? "block" : "unblock"}`,
      );
    });
  }

  function onResetPassword(u: UserProfile) {
    if (!window.confirm(t("confirmReset"))) return;
    void run(async () => {
      const res = await api.post<ProvisionalPasswordResponse>(
        `/api/users/${u.id}/reset-password`,
      );
      setProvisional({ email: u.email, password: res.provisionalPassword });
    });
  }

  if (loading || !admin) return <LoadingScreen />;

  return (
    <>
      <Header user={admin} />
      <main className="container">
        <h1>{t("title")}</h1>

        <div className="toolbar">
          <input
            type="search"
            placeholder={tc("search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            value={stato}
            onChange={(e) =>
              setStato(e.target.value as "" | "ATTIVO" | "BLOCCATO")
            }
            style={{ width: "auto" }}
          >
            <option value="">{t("filterAll")}</option>
            <option value="ATTIVO">{t("filterActive")}</option>
            <option value="BLOCCATO">{t("filterBlocked")}</option>
          </select>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            {t("total", { count: total })}
          </span>
          <span className="spacer" />
          <button className="primary" onClick={() => setEditor({ mode: "create" })}>
            {t("newClient")}
          </button>
        </div>

        {error && <div className="error-box">{tServer(error)}</div>}

        <UserTable
          items={items}
          onEdit={(u) => setEditor({ mode: "edit", user: u })}
          onResetPassword={onResetPassword}
          onBlockToggle={onBlockToggle}
        />
      </main>

      {editor && (
        <UserEditorModal
          target={editor}
          onClose={() => setEditor(null)}
          onSaved={(prov) => {
            setEditor(null);
            if (prov) setProvisional(prov);
            void reload();
          }}
        />
      )}

      {provisional && (
        <ProvisionalPasswordModal
          email={provisional.email}
          password={provisional.password}
          onClose={() => setProvisional(null)}
        />
      )}
    </>
  );
}
