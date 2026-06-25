"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "../../../lib/api";
import type { CustomerListResponse, CustomerProfile, ProvisionalPasswordResponse } from "../../../lib/types";
import AdminTopBar from "../AdminTopBar";
import DataTable, { type Column, type RowAction } from "../DataTable";
import UserEditorModal, { UserEditorTarget } from "../../users/UserEditorModal";
import ProvisionalPasswordModal from "../../users/ProvisionalPasswordModal";
import { IconEdit, IconLock, IconPlus, IconReset, IconUnlock } from "../icons";
import { initials } from "../../../lib/helpers";
import { PAGE_SIZE } from "../types";

export default function ClientiSection() {
  const t = useTranslations("admin");
  const tServer = useTranslations("server");

  const [items, setItems] = useState<CustomerProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [stato, setStato] = useState("");
  const [cliPage, setCliPage] = useState(1);
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
    params.set("page", String(cliPage));
    params.set("pageSize", String(PAGE_SIZE));
    const res = await api.get<CustomerListResponse>(`/api/customers?${params}`);
    setItems(res.items);
    setTotal(res.total);
  }, [q, stato, cliPage]);

  useEffect(() => { reload().catch(() => setError("errors.generic")); }, [reload]);

  useEffect(() => setCliPage(1), [q, stato]);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "errors.generic");
    }
  }

  function onBlockToggle(u: CustomerProfile) {
    if (u.stato === "ATTIVO" && !window.confirm(t("confirmBlock"))) return;
    void run(async () => {
      await api.post(`/api/customers/${u.id}/${u.stato === "ATTIVO" ? "block" : "unblock"}`);
    });
  }

  function onResetPassword(u: CustomerProfile) {
    if (!window.confirm(t("confirmReset"))) return;
    void run(async () => {
      const res = await api.post<ProvisionalPasswordResponse>(`/api/customers/${u.id}/reset-password`);
      setProvisional({ email: u.email, password: res.provisionalPassword });
    });
  }

  const clientColumns: Column<CustomerProfile>[] = [
    {
      key: "cliente",
      header: "Cliente",
      grow: true,
      cell: (u) => (
        <div className="cell-entity">
          <span className="cell-entity-thumb">{initials(u.nome)}</span>
          <div className="cell-entity-text">
            <span className="cell-entity-sub">{u.email}</span>
            <span className="cell-entity-title">{u.nome || "—"}</span>
            <span className="cell-entity-sub">{u.ragioneSociale || "—"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "piva",
      header: "P.IVA",
      width: "150px",
      mono: true,
      cell: (u) => u.partitaIva || "—",
    },
    {
      key: "stato",
      header: "Stato",
      width: "120px",
      align: "center",
      cell: (u) => (
        <span className={`status ${u.stato === "ATTIVO" ? "status-active" : "status-hidden"}`}>
          {u.stato === "ATTIVO" ? t("statusActive") : t("statusBlocked")}
        </span>
      ),
    },
  ];
  const clientActions: RowAction<CustomerProfile>[] = [
    { icon: () => IconEdit, tooltip: () => t("edit"), onClick: (u) => setEditor({ mode: "edit", user: u }) },
    { icon: () => IconReset, tooltip: () => t("resetPassword"), onClick: onResetPassword },
    {
      icon: (u) => (u.stato === "ATTIVO" ? IconLock : IconUnlock),
      tooltip: (u) => (u.stato === "ATTIVO" ? t("block") : t("unblock")),
      onClick: onBlockToggle,
      variant: "danger",
    },
  ];

  return (
    <>
      <AdminTopBar
        title="Gestione Clienti"
        searchValue={q}
        onSearchChange={setQ}
        filter={stato}
        onFilterChange={setStato}
      >
        <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => setEditor({ mode: "create" })}>
          {IconPlus}
          {t("newClient")}
        </button>
      </AdminTopBar>
      <div className="admin-content">
        <div className="content-header">
          <div>
            <h2>Tutti i clienti</h2>
            <span className="meta">{t("total", { count: total })}</span>
          </div>
        </div>
        {error && <div className="error-box">{tServer(error)}</div>}
        <DataTable
          columns={clientColumns}
          rows={items}
          rowKey={(u) => u.id}
          actions={clientActions}
          emptyText={t("noResults")}
          page={cliPage}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setCliPage}
        />
      </div>

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
          onClose={() => setProvisional(null)}
        />
      )}
    </>
  );
}
