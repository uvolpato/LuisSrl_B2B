"use client";

import { useTranslations } from "next-intl";
import type { UserProfile } from "../../lib/types";

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

  return (
    <>
      <div className="table-header visible">
        <span></span>
        <span>Cliente</span>
        <span>P.IVA</span>
        <span>Stato</span>
        <span>Azioni</span>
      </div>
      <div className="article-grid view-list">
        {items.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)", fontSize: 14, gridColumn: "1 / -1" }}>
            {t("noResults")}
          </div>
        )}
        {items.map((u) => (
          <div key={u.id} className="article-card">
            <div className="article-card-img" style={{ display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent)", fontWeight: 600, fontSize: 13 }}>
              {u.nome ? u.nome.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "??"}
            </div>
            <div className="article-card-body">
              <div className="article-card-top">
                <span className="article-card-id">{u.email}</span>
                <h3>{u.nome || "—"}</h3>
                <span className="article-card-color">{u.ragioneSociale || "—"}</span>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", minWidth: 90, flexShrink: 0 }}>
                {u.partitaIva || "—"}
              </span>
              <span className={`status ${u.stato === "ATTIVO" ? "status-active" : "status-hidden"}`}>
                {u.stato === "ATTIVO" ? t("statusActive") : t("statusBlocked")}
              </span>
              <div className="article-card-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => onEdit(u)}>
                  {t("edit")}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => onResetPassword(u)}>
                  {t("resetPassword")}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => onBlockToggle(u)}>
                  {u.stato === "ATTIVO" ? t("block") : t("unblock")}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
