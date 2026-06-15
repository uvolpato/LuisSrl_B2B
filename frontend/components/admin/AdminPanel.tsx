"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { api } from "../../lib/api";
import type { UserProfile, CustomerProfile, UserListResponse, CustomerListResponse } from "../../lib/types";
import { usePresence } from "../../lib/use-presence";
import DataTable, { type Column, type RowAction } from "./DataTable";

const svg = (paths: React.ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {paths}
  </svg>
);

const IconSearch = svg(<><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>);
const IconPlus = svg(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>);
const IconEdit = svg(<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>);
const IconPanoramica = svg(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>);
const IconGruppi = svg(<><circle cx="12" cy="8" r="5" /><circle cx="6" cy="18" r="4" /><circle cx="18" cy="18" r="4" /></>);

const PAGE_SIZE = 20;

function formatDate(d: string): string {
  if (!d) return "-";
  const dt = new Date(d);
  return dt.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type UserTab = "utenti" | "clienti";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<UserTab>("utenti");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UserListResponse | CustomerListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { isOnline } = usePresence();

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (debouncedSearch) params.set("q", debouncedSearch);
      const endpoint = activeTab === "utenti" ? "/api/admin/users" : "/api/customers";
      const res = await api.get<UserListResponse | CustomerListResponse>(endpoint + "?" + params);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore caricamento");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, activeTab]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const userColumns: Column<UserProfile>[] = useMemo(() => [
    {
      key: "ruolo",
      header: "Ruolo",
      width: "150px",
      cell: (u) => {
        const labels: Record<string, string> = { SUPERUSER: "Super Admin", AMMINISTRATORE: "Amministratore", UTENTE: "Utente", SOSPESO: "Sospeso" };
        return <span className="admin-panel-role">{labels[u.ruolo] ?? u.ruolo}</span>;
      },
    },
    {
      key: "nome",
      header: "Nome",
      grow: true,
      cell: (u) => {
        const online = isOnline(u.id);
        return (
          <div className="user-cell-name">
            <span className="user-avatar" style={{ background: u.avatarColor, color: "#fff" }}>{u.nome.charAt(0).toUpperCase()}</span>
            <span className="cell-entity-title">{u.nome}</span>
            {u.ruolo === "SUPERUSER" && <span className="admin-panel-super-badge">Super Admin</span>}
            <span className={`user-status-dot ${online ? "online" : "offline"}`} />
          </div>
        );
      },
    },
    {
      key: "email",
      header: "Email",
      width: "220px",
      mono: true,
      cell: (u) => u.email,
    },
    {
      key: "createdAt",
      header: "Creato il",
      width: "110px",
      mono: true,
      cell: (u) => formatDate(u.createdAt as string),
    },
  ], [isOnline]);

  const customerColumns: Column<CustomerProfile>[] = useMemo(() => [
    {
      key: "nome",
      header: "Nome",
      grow: true,
      cell: (c) => {
        const online = isOnline(c.id);
        return (
          <div className="user-cell-name">
            <span className="user-avatar" style={{ background: c.avatarColor, color: "#fff" }}>{c.nome.charAt(0).toUpperCase()}</span>
            <span className="cell-entity-title">{c.nome}</span>
            <span className="cell-subtitle">{c.ragioneSociale}</span>
            <span className={`user-status-dot ${online ? "online" : "offline"}`} />
          </div>
        );
      },
    },
    {
      key: "email",
      header: "Email",
      width: "220px",
      mono: true,
      cell: (c) => c.email,
    },
    {
      key: "partitaIva",
      header: "P.IVA",
      width: "130px",
      mono: true,
      cell: (c) => c.partitaIva ?? "-",
    },
    {
      key: "telefono",
      header: "Telefono",
      width: "130px",
      mono: true,
      cell: (c) => c.telefono ?? "-",
    },
    {
      key: "createdAt",
      header: "Creato il",
      width: "110px",
      mono: true,
      cell: (c) => formatDate(c.createdAt as string),
    },
  ], [isOnline]);

  const actions: RowAction<any>[] = [
    { icon: () => IconEdit, tooltip: () => "Modifica", onClick: () => {} },
  ];

  const isUsers = activeTab === "utenti";

  return (
    <div className="admin-panel">
      <div className="admin-panel-tabs">
        <button className={`admin-panel-tab ${activeTab === "utenti" ? "active" : ""}`} onClick={() => { setActiveTab("utenti"); setPage(1); }}>
          Utenti
        </button>
        <button className={`admin-panel-tab ${activeTab === "clienti" ? "active" : ""}`} onClick={() => { setActiveTab("clienti"); setPage(1); }}>
          Clienti
        </button>
      </div>

      <div className="admin-panel-body">
        <div className="admin-panel-content">
          <div className="admin-panel-header">
            <h2 className="admin-panel-title">{isUsers ? "Utenti" : "Clienti"}</h2>
            {data && <span className="admin-panel-count-badge">{data.total}</span>}
          </div>
          <div className="admin-panel-toolbar">
            <div className="admin-panel-search">
              {IconSearch}
              <input
                type="text"
                placeholder={isUsers ? "Cerca utenti..." : "Cerca clienti..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="admin-btn admin-btn-primary admin-btn-sm">
              {IconPlus}
              {isUsers ? "Nuovo utente" : "Nuovo cliente"}
            </button>
          </div>

          {loading && <div className="admin-panel-loading">Caricamento...</div>}
          {error && <div className="admin-panel-error">{error}</div>}
          {!loading && !error && data && (
            <DataTable
              columns={(isUsers ? userColumns : customerColumns) as any}
              rows={data.items}
              rowKey={(r: any) => String(r.id)}
              actions={actions}
              emptyText={isUsers ? "Nessun utente trovato" : "Nessun cliente trovato"}
              page={page}
              pageSize={PAGE_SIZE}
              total={data.total}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
