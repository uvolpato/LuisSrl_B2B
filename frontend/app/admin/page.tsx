"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError, UserProfile } from "../../lib/api";
import { useAuth } from "../../lib/use-auth";
import Header from "../../components/Header";

interface ListResponse {
  items: UserProfile[];
  total: number;
}

interface CreateResponse {
  user: UserProfile;
  provisionalPassword: string;
}

type EditorState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; user: UserProfile };

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
  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });
  const [provisional, setProvisional] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const reload = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (stato) params.set("stato", stato);
    const res = await api.get<ListResponse>(`/api/users?${params}`);
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
      const res = await api.post<CreateResponse>(
        `/api/users/${u.id}/reset-password`,
      );
      setProvisional({ email: u.email, password: res.provisionalPassword });
    });
  }

  if (loading || !admin) {
    return (
      <div className="center-page">
        <p style={{ color: "var(--muted)" }}>{tc("loading")}</p>
      </div>
    );
  }

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

        <div className="card" style={{ padding: 0, overflow: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>{t("colEmail")}</th>
                <th>{t("colName")}</th>
                <th>{t("colCompany")}</th>
                <th>{t("colPiva")}</th>
                <th>{t("colStatus")}</th>
                <th>{tc("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ color: "var(--muted)" }}>
                    {t("noResults")}
                  </td>
                </tr>
              )}
              {items.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.nome}</td>
                  <td>{u.ragioneSociale ?? "—"}</td>
                  <td className="mono">{u.partitaIva ?? "—"}</td>
                  <td>
                    <span
                      className={`badge ${u.stato === "ATTIVO" ? "active" : "blocked"}`}
                    >
                      {u.stato === "ATTIVO"
                        ? t("statusActive")
                        : t("statusBlocked")}
                    </span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      className="small"
                      onClick={() => setEditor({ mode: "edit", user: u })}
                    >
                      {t("edit")}
                    </button>{" "}
                    <button className="small" onClick={() => onResetPassword(u)}>
                      {t("resetPassword")}
                    </button>{" "}
                    <button
                      className={`small ${u.stato === "ATTIVO" ? "danger" : ""}`}
                      onClick={() => onBlockToggle(u)}
                    >
                      {u.stato === "ATTIVO" ? t("block") : t("unblock")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {editor.mode !== "closed" && (
        <UserEditor
          state={editor}
          onClose={() => setEditor({ mode: "closed" })}
          onSaved={(prov) => {
            setEditor({ mode: "closed" });
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

function UserEditor({
  state,
  onClose,
  onSaved,
}: {
  state: { mode: "create" } | { mode: "edit"; user: UserProfile };
  onClose: () => void;
  onSaved: (prov: { email: string; password: string } | null) => void;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const tServer = useTranslations("server");
  const editing = state.mode === "edit" ? state.user : null;

  const [form, setForm] = useState({
    email: editing?.email ?? "",
    nome: editing?.nome ?? "",
    ragioneSociale: editing?.ragioneSociale ?? "",
    partitaIva: editing?.partitaIva ?? "",
    telefono: editing?.telefono ?? "",
    preferredLanguage: editing?.preferredLanguage ?? "it",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      nome: form.nome,
      ragioneSociale: form.ragioneSociale || undefined,
      partitaIva: form.partitaIva || undefined,
      telefono: form.telefono || undefined,
      preferredLanguage: form.preferredLanguage,
    };
    try {
      if (editing) {
        await api.patch(`/api/users/${editing.id}`, payload);
        onSaved(null);
      } else {
        const res = await api.post<CreateResponse>("/api/users", {
          email: form.email,
          ...payload,
        });
        onSaved({ email: res.user.email, password: res.provisionalPassword });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "errors.generic");
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <h2 style={{ marginTop: 0 }}>
          {editing ? t("editTitle") : t("createTitle")}
        </h2>

        {error && <div className="error-box">{tServer(error)}</div>}

        <label>{t("fieldEmail")}</label>
        <input
          type="email"
          required
          disabled={!!editing}
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
        />
        <label>{t("fieldName")}</label>
        <input
          required
          value={form.nome}
          onChange={(e) => set("nome", e.target.value)}
        />
        <label>{t("fieldCompany")}</label>
        <input
          value={form.ragioneSociale}
          onChange={(e) => set("ragioneSociale", e.target.value)}
        />
        <label>{t("fieldPiva")}</label>
        <input
          value={form.partitaIva}
          onChange={(e) => set("partitaIva", e.target.value)}
        />
        <label>{t("fieldPhone")}</label>
        <input
          value={form.telefono}
          onChange={(e) => set("telefono", e.target.value)}
        />
        <label>{t("fieldLanguage")}</label>
        <select
          value={form.preferredLanguage}
          onChange={(e) => set("preferredLanguage", e.target.value)}
        >
          <option value="it">Italiano</option>
          <option value="en">English</option>
        </select>

        <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose}>
            {tc("cancel")}
          </button>
          <button className="primary" disabled={busy}>
            {tc("save")}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProvisionalPasswordModal({
  email,
  password,
  onClose,
}: {
  email: string;
  password: string;
  onClose: () => void;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [copied, setCopied] = useState(false);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{t("provisionalTitle")}</h2>
        <p style={{ color: "var(--muted)" }}>{t("provisionalNote")}</p>
        <p className="mono" style={{ fontSize: 14 }}>{email}</p>
        <div
          className="warn-box mono"
          style={{ fontSize: 22, textAlign: "center", letterSpacing: 2 }}
        >
          {password}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={() => {
              void navigator.clipboard.writeText(password).then(() => {
                setCopied(true);
              });
            }}
          >
            {copied ? tc("copied") : tc("copy")}
          </button>
          <button className="primary" onClick={onClose}>
            {tc("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
