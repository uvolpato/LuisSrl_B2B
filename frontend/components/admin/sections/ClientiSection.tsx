"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "../../../lib/api";
import type { CustomerListResponse, CustomerProfile, ProvisionalPasswordResponse } from "../../../lib/types";
import AdminTopBar from "../AdminTopBar";
import DataTable, { type Column, type RowAction } from "../DataTable";
import UserEditorModal, { UserEditorTarget } from "../../users/UserEditorModal";
import ProvisionalPasswordModal from "../../users/ProvisionalPasswordModal";
import { IconEdit, IconLock, IconMail, IconPlus, IconRefresh, IconReset, IconUnlock } from "../icons";
import { initials } from "../../../lib/helpers";
import { PAGE_SIZE } from "../types";
import { useConfirm } from "../../common/ConfirmProvider";
import Notice from "../../common/Notice";
import ImportaClientiModal from "../ImportaClientiModal";

type SyncProgress = { running: boolean; pct: number; phase: string; errorText?: string };

export default function ClientiSection() {
  const t = useTranslations("admin");
  const tServer = useTranslations("server");
  const confirm = useConfirm();

  const [items, setItems] = useState<CustomerProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [stato, setStato] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [cliPage, setCliPage] = useState(1);
  const [cliSort, setCliSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<UserEditorTarget | null>(null);
  const [provisional, setProvisional] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncFlash, setSyncFlash] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function doSyncClienti() {
    setSyncing(true);
    setSyncProgress(null);
    setSyncFlash(null);
    setSyncError(null);
    const steps = ["/api/integrazione/sync/clienti", "/api/integrazione/sync/ordini"];
    try {
      for (const step of steps) {
        await api.post<{ status: string }>(step);
        await new Promise<void>((resolve) => {
          pollRef.current = setInterval(async () => {
            try {
              const p = await api.get<SyncProgress>("/api/integrazione/sync/progress");
              setSyncProgress(p);
              if (!p.running) {
                if (pollRef.current) clearInterval(pollRef.current);
                pollRef.current = null;
                if (p.phase.startsWith("Err") || p.phase.startsWith("Errore")) {
                  setSyncFlash("Errore");
                  setSyncError(p.errorText ?? "Errore sconosciuto");
                  flashRef.current = setTimeout(() => setSyncFlash(null), 3000);
                  setSyncing(false);
                  resolve();
                } else {
                  resolve();
                }
              }
            } catch {
              resolve();
            }
          }, 500);
        });
        if (syncError) break;
      }
      if (!syncError) {
        setSyncFlash("OK");
        flashRef.current = setTimeout(() => setSyncFlash(null), 2000);
        setSyncing(false);
        void reload();
      }
    } catch {
      setSyncProgress({ running: false, pct: 0, phase: "Errore sincronizzazione" });
      setSyncing(false);
      setSyncFlash("Errore");
      setSyncError("Impossibile avviare la sincronizzazione");
      flashRef.current = setTimeout(() => setSyncFlash(null), 3000);
    }
  }

  const reload = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (stato === "da-invitare") params.set("invitato", "no");
    else if (stato) params.set("stato", stato);
    params.set("page", String(cliPage));
    params.set("pageSize", String(PAGE_SIZE));
    if (cliSort) {
      params.set("sort", cliSort.key);
      params.set("dir", cliSort.dir);
    }
    const res = await api.get<CustomerListResponse>(`/api/customers?${params}`);
    setItems(res.items);
    setTotal(res.total);
  }, [q, stato, cliPage, cliSort]);

  useEffect(() => { reload().catch(() => setError("errors.generic")); }, [reload]);

  useEffect(() => setCliPage(1), [q, stato]);

  const onCliSort = useCallback((key: string, dir: "asc" | "desc") => {
    setCliSort({ key, dir });
    setCliPage(1);
  }, []);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (flashRef.current) clearTimeout(flashRef.current);
  }, []);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "errors.generic");
    }
  }

  async function onBlockToggle(u: CustomerProfile) {
    if (u.stato === "ATTIVO" && !(await confirm({ message: t("confirmBlock"), tone: "danger" }))) return;
    void run(async () => {
      await api.post(`/api/customers/${u.id}/${u.stato === "ATTIVO" ? "block" : "unblock"}`);
    });
  }

  async function onResetPassword(u: CustomerProfile) {
    if (!(await confirm({ message: t("confirmReset"), tone: "danger" }))) return;
    void run(async () => {
      const res = await api.post<ProvisionalPasswordResponse>(`/api/customers/${u.id}/reset-password`);
      setProvisional({ email: u.email, password: res.provisionalPassword });
    });
  }

  async function onInvita(u: CustomerProfile) {
    const reinvio = !!u.invitatoAt;
    if (!(await confirm({
      title: reinvio ? "Reinvia invito" : "Invia invito",
      message: <>Inviare l&apos;invito B2B a <strong>{u.email}</strong>?{reinvio ? " Verrà generata una nuova password temporanea." : " Il cliente riceverà email con le credenziali temporanee."}</>,
      confirmLabel: reinvio ? "Reinvia" : "Invia invito",
    }))) return;
    void run(async () => {
      await api.post(`/api/customers/${u.id}/invita`);
      setInviteResult(`Invito inviato a ${u.email}`);
    });
  }

  async function onInvitaBulk() {
    const ids = [...selectedIds].map(Number);
    if (!ids.length) return;
    if (!(await confirm({
      title: "Invita selezionati",
      message: <>Inviare l&apos;invito B2B a <strong>{ids.length} clienti</strong>? Ogni cliente riceverà email con credenziali temporanee.</>,
      confirmLabel: `Invia ${ids.length} inviti`,
    }))) return;
    setInviting(true);
    setError(null);
    try {
      const res = await api.post<{ inviati: number[]; falliti: { id: number; errore: string }[] }>(
        "/api/customers/invita-bulk",
        { customerIds: ids },
      );
      setInviteResult(
        `Inviti inviati: ${res.inviati.length}` +
        (res.falliti.length ? ` · Falliti: ${res.falliti.length} (id ${res.falliti.map((f) => f.id).join(", ")})` : ""),
      );
      setSelectedIds(new Set());
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "errors.generic");
    } finally {
      setInviting(false);
    }
  }

  const clientColumns: Column<CustomerProfile>[] = [
    {
      key: "cliente",
      header: "Cliente",
      grow: true,
      sortable: true,
      sortValue: (u) => u.ragioneSociale || u.nome || "",
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
      sortable: true,
      sortValue: (u) => u.partitaIva || "",
      cell: (u) => u.partitaIva || "—",
    },
    {
      key: "ordini",
      header: "Ordini",
      width: "110px",
      align: "center",
      sortable: true,
      sortValue: (u) => u.numOrdini ?? 0,
      cell: (u) => (
        <span>
          {u.numOrdini ?? 0}
          {u.numOrdiniAnno ? <span style={{ color: "var(--muted)", fontSize: 12 }}> ({u.numOrdiniAnno})</span> : null}
        </span>
      ),
    },
    {
      key: "invito",
      header: "Invito B2B",
      width: "130px",
      align: "center",
      sortable: true,
      sortValue: (u) => u.invitatoAt ?? "",
      cell: (u) => u.invitatoAt ? (
        <span className="status status-active" title={new Date(u.invitatoAt).toLocaleString("it-IT")}>
          {new Date(u.invitatoAt).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" })}
        </span>
      ) : (
        <span className="status status-hidden">Da invitare</span>
      ),
    },
    {
      key: "stato",
      header: "Stato",
      width: "120px",
      align: "center",
      sortable: true,
      sortValue: (u) => u.stato,
      cell: (u) => (
        <span className={`status ${u.stato === "ATTIVO" ? "status-active" : "status-hidden"}`}>
          {u.stato === "ATTIVO" ? t("statusActive") : t("statusBlocked")}
        </span>
      ),
    },
  ];
  const clientActions: RowAction<CustomerProfile>[] = [
    { icon: () => IconEdit, tooltip: () => t("edit"), onClick: (u) => setEditor({ mode: "edit", user: u }) },
    { icon: () => IconMail, tooltip: (u) => (u.invitatoAt ? "Reinvia invito B2B" : "Invia invito B2B"), onClick: onInvita },
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
        searchPlaceholder="Cerca cliente, codice, P.IVA, email…"
        filter={stato}
        onFilterChange={setStato}
        filterOptions={[
          { value: "", label: "Tutti" },
          { value: "ATTIVO", label: "Attivi" },
          { value: "BLOCCATO", label: "Bloccati" },
          { value: "da-invitare", label: "Da invitare" },
        ]}
      >
        <button className="admin-btn admin-btn-secondary" onClick={doSyncClienti} disabled={syncing} style={{ minWidth: 130, justifyContent: "center" }}>
          <span className={`sync-icon ${syncing ? "spin" : ""}`}>{IconRefresh}</span>
          <span>{syncing && syncProgress ? `${syncProgress.pct}%` : syncFlash ?? "Sincronizza"}</span>
        </button>
        <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => setImportOpen(true)}>
          {IconPlus}
          {t("newClient")}
        </button>
      </AdminTopBar>
      <div className="admin-content">
        <div className="content-header">
          <div>
            <span className="meta">{t("total", { count: total })}</span>
          </div>
          {selectedIds.size > 0 && (
            <button className="admin-btn admin-btn-primary" onClick={onInvitaBulk} disabled={inviting}>
              {IconMail}
              {inviting ? "Invio in corso…" : `Invita selezionati (${selectedIds.size})`}
            </button>
          )}
        </div>
        {error && <Notice variant="error" onClose={() => setError(null)}>{tServer(error)}</Notice>}
        {syncError && <Notice variant="error" onClose={() => setSyncError(null)} style={{ marginBottom: 8 }}>{syncError}</Notice>}
        {inviteResult && <Notice variant="success" onClose={() => setInviteResult(null)} style={{ marginBottom: 8 }}>{inviteResult}</Notice>}
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
          sortKey={cliSort?.key}
          sortDir={cliSort?.dir}
          onSort={onCliSort}
          selectable
          selectedKeys={selectedIds}
          onSelectionChange={setSelectedIds}
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

      <ImportaClientiModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => void reload()}
      />
    </>
  );
}
