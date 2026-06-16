"use client";

import { FormEvent, useState, useCallback } from "react";
import { api, ApiError } from "../../lib/api";
import type { UserProfile } from "../../lib/types";
import Modal from "../common/Modal";

export type UserAdminTarget =
  | { mode: "create" }
  | { mode: "edit"; user: UserProfile };

const RUOLI = [
  { value: "UTENTE", label: "Utente" },
  { value: "AMMINISTRATORE", label: "Amministratore" },
  { value: "SUPERUSER", label: "Super Admin" },
] as const;

const LANG = [
  { value: "it", label: "Italiano" },
  { value: "en", label: "English" },
];

export default function UserAdminEditorModal({
  target,
  onClose,
  onSaved,
}: {
  target: UserAdminTarget;
  onClose: () => void;
  onSaved: (prov?: { email: string; password: string } | null) => void;
}) {
  const editing = target.mode === "edit" ? target.user : null;
  const [form, setForm] = useState({
    email: editing?.email ?? "",
    nome: editing?.nome ?? "",
    ruolo: editing?.ruolo ?? "UTENTE",
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
    try {
      if (editing) {
        await api.patch(`/api/users/${editing.id}`, {
          nome: form.nome,
          ruolo: form.ruolo,
          preferredLanguage: form.preferredLanguage,
        });
        onSaved();
      } else {
        const res = await api.post<{ user: UserProfile; provisionalPassword: string }>("/api/users", {
          email: form.email,
          nome: form.nome,
          ruolo: form.ruolo,
          preferredLanguage: form.preferredLanguage,
        });
        onSaved({ email: form.email, password: res.provisionalPassword });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "errors.generic");
      setBusy(false);
    }
  }

  const [busyAction, setBusyAction] = useState<string | null>(null);

  const doAction = useCallback(async (action: string, fn: () => Promise<void>) => {
    setBusyAction(action);
    setError(null);
    try {
      await fn();
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "errors.generic");
    } finally {
      setBusyAction(null);
    }
  }, [onSaved]);

  const isDeleted = editing?.deletedAt;

  return (
    <Modal
      title={editing ? `Modifica ${editing.nome}` : "Nuovo utente"}
      size="sm"
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        {error && <div className="error-box" style={{ marginBottom: 14 }}>{error}</div>}

        <label>Email</label>
        <input
          type="email" required disabled={!!editing || busy}
          value={form.email} onChange={(e) => set("email", e.target.value)}
        />

        <label>Nome</label>
        <input required disabled={busy}
          value={form.nome} onChange={(e) => set("nome", e.target.value)}
        />

        <label>Ruolo</label>
        <select disabled={busy || !!isDeleted}
          value={form.ruolo} onChange={(e) => set("ruolo", e.target.value)}
        >
          {RUOLI.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        <label>Lingua</label>
        <select disabled={busy}
          value={form.preferredLanguage} onChange={(e) => set("preferredLanguage", e.target.value)}
        >
          {LANG.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose}>Annulla</button>
          <button className="primary" disabled={busy || !!busyAction}>
            {busy ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </form>

      {editing && !isDeleted && (
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12, fontWeight: 500 }}>AZIONI</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-secondary"
              disabled={!!busyAction}
              onClick={() => doAction("reset", async () => {
                const res = await api.post<{ user: UserProfile; provisionalPassword: string }>(
                  `/api/users/${editing.id}/reset-password`
                );
                onSaved({ email: editing.email, password: res.provisionalPassword });
              })}
            >
              {busyAction === "reset" ? "..." : "Reset password"}
            </button>

            {editing.stato === "ATTIVO" ? (
              <button
                type="button"
                className="admin-btn admin-btn-sm admin-btn-secondary"
                disabled={!!busyAction}
                onClick={() => doAction("block", async () => {
                  await api.post(`/api/users/${editing.id}/block`);
                })}
              >
                {busyAction === "block" ? "..." : "Blocca"}
              </button>
            ) : (
              <button
                type="button"
                className="admin-btn admin-btn-sm admin-btn-secondary"
                disabled={!!busyAction}
                onClick={() => doAction("unblock", async () => {
                  await api.post(`/api/users/${editing.id}/unblock`);
                })}
              >
                {busyAction === "unblock" ? "..." : "Sblocca"}
              </button>
            )}

            {editing.ruolo !== "SUPERUSER" && (
              <button
                type="button"
                className="admin-btn admin-btn-sm admin-btn-ghost"
                style={{ color: "var(--red)" }}
                disabled={!!busyAction}
                onClick={() => doAction("delete", async () => {
                  await api.del(`/api/users/${editing.id}`);
                })}
              >
                {busyAction === "delete" ? "..." : "Elimina"}
              </button>
            )}
          </div>
        </div>
      )}

      {editing?.deletedAt && (
        <div style={{ marginTop: 20, padding: 12, borderRadius: 8, background: "var(--fg-soft)", fontSize: 13, color: "var(--muted)" }}>
          Utente disattivato il {new Date(editing.deletedAt).toLocaleDateString("it-IT")}
        </div>
      )}
    </Modal>
  );
}
