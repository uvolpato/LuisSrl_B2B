"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "../../lib/api";
import type {
  CustomerProfile,
} from "../../lib/types";
import Modal from "../common/Modal";
import Notice from "../common/Notice";

export type UserEditorTarget =
  | { mode: "create" }
  | { mode: "edit"; user: CustomerProfile };

export default function UserEditorModal({
  target,
  onClose,
  onSaved,
}: {
  target: UserEditorTarget;
  onClose: () => void;
  onSaved: (prov: { email: string; password: string } | null) => void;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const tServer = useTranslations("server");
  const editing = target.mode === "edit" ? target.user : null;

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
        await api.patch(`/api/customers/${editing.id}`, payload);
        onSaved(null);
      } else {
        const res = await api.post<{ customer: CustomerProfile; provisionalPassword: string }>("/api/customers", {
          email: form.email,
          ...payload,
        });
        onSaved({ email: res.customer.email, password: res.provisionalPassword });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "errors.generic");
      setBusy(false);
    }
  }

  return (
    <Modal title={editing ? t("editTitle") : t("createTitle")} onClose={onClose}>
      <form onSubmit={onSubmit}>
        {error && <Notice variant="error" onClose={() => setError(null)}>{tServer(error)}</Notice>}

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

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 22,
            justifyContent: "flex-end",
          }}
        >
          <button type="button" onClick={onClose}>
            {tc("cancel")}
          </button>
          <button className="primary" disabled={busy}>
            {tc("save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
