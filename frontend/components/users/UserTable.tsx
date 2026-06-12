"use client";

import { useTranslations } from "next-intl";
import type { UserProfile } from "../../lib/types";

/** Tabella clienti del pannello admin: presentazione pura, azioni delegate. */
export default function UserTable({
  items,
  onEdit,
  onResetPassword,
  onBlockToggle,
}: {
  items: UserProfile[];
  onEdit: (user: UserProfile) => void;
  onResetPassword: (user: UserProfile) => void;
  onBlockToggle: (user: UserProfile) => void;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");

  return (
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
                  {u.stato === "ATTIVO" ? t("statusActive") : t("statusBlocked")}
                </span>
              </td>
              <td style={{ whiteSpace: "nowrap" }}>
                <button className="small" onClick={() => onEdit(u)}>
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
  );
}
