"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { api } from "../../lib/api";
import type { UserProfile, CustomerProfile, UserListResponse, CustomerListResponse, PermissionGroup } from "../../lib/types";
import { usePresence } from "../../lib/use-presence";
import DataTable, { type Column, type RowAction } from "./DataTable";
import UserAdminEditorModal, { type UserAdminTarget } from "../users/UserAdminEditorModal";
import UserEditorModal, { type UserEditorTarget } from "../users/UserEditorModal";
import Modal from "../common/Modal";

const svg = (paths: React.ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {paths}
  </svg>
);

const IconSearch = svg(<><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>);
const IconPlus = svg(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>);
const IconEdit = svg(<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>);
const IconLock = svg(<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>);
const IconLockOpen = svg(<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0" strokeLinecap="round" /></>);
const IconReset = svg(<><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="16" cy="12" r="1" fill="currentColor" /></>);
const IconTrash = svg(<><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>);

const PAGE_SIZE = 20;

function formatDate(d: string): string {
  if (!d) return "-";
  const dt = new Date(d);
  return dt.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type UserTab = "utenti" | "clienti";
type UserSubTab = "panoramica" | "gruppi";
type StatoFilter = "" | "ATTIVO" | "BLOCCATO" | "ELIMINATO" | "TUTTI";

const ALL_PERMISSIONS = [
  { key: "admin.users.view", label: "Visualizzare utenti" },
  { key: "admin.users.create", label: "Creare utenti" },
  { key: "admin.users.edit", label: "Modificare utenti" },
  { key: "admin.users.block", label: "Bloccare/sbloccare utenti" },
  { key: "admin.permissions.view", label: "Visualizzare permessi e gruppi" },
  { key: "admin.permissions.edit", label: "Modificare permessi e gruppi" },
  { key: "admin.settings.view", label: "Visualizzare impostazioni" },
  { key: "admin.settings.edit", label: "Modificare impostazioni" },
  { key: "catalog.articles.view", label: "Visualizzare articoli" },
  { key: "catalog.articles.create", label: "Creare articoli" },
  { key: "catalog.articles.edit", label: "Modificare articoli" },
  { key: "catalog.articles.delete", label: "Eliminare articoli" },
  { key: "catalog.famiglie.view", label: "Visualizzare famiglie" },
  { key: "catalog.raccolte.view", label: "Visualizzare raccolte" },
  { key: "catalog.raccolte.edit", label: "Modificare raccolte" },
  { key: "vendite.clienti.view", label: "Visualizzare clienti" },
  { key: "vendite.ordini.view", label: "Visualizzare ordini" },
  { key: "vendite.ordini.edit", label: "Modificare ordini" },
  { key: "strumenti.import.view", label: "Visualizzare import" },
  { key: "strumenti.import.execute", label: "Eseguire import" },
  { key: "strumenti.ai.view", label: "Visualizzare AI" },
];

const STATO_FILTERS: { value: StatoFilter; label: string }[] = [
  { value: "", label: "Attivi" },
  { value: "BLOCCATO", label: "Bloccati" },
  { value: "ELIMINATO", label: "Eliminati" },
  { value: "TUTTI", label: "Tutti" },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<UserTab>("utenti");
  const [userSubTab, setUserSubTab] = useState<UserSubTab>("panoramica");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statoFilter, setStatoFilter] = useState<StatoFilter>("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UserListResponse | CustomerListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { isOnline } = usePresence();

  const [userEditorTarget, setUserEditorTarget] = useState<UserAdminTarget | null>(null);
  const [customerEditorTarget, setCustomerEditorTarget] = useState<UserEditorTarget | null>(null);
  const [provisional, setProvisional] = useState<{ email: string; password: string } | null>(null);

  const isUsers = useMemo(() => activeTab === "utenti", [activeTab]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (isUsers && statoFilter) params.set("stato", statoFilter);
      const endpoint = isUsers ? "/api/admin/users" : "/api/customers";
      const res = await api.get<UserListResponse | CustomerListResponse>(endpoint + "?" + params);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore caricamento");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, isUsers, statoFilter]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUserSaved = useCallback((prov?: { email: string; password: string } | null) => {
    setUserEditorTarget(null);
    if (prov) setProvisional(prov);
    fetchUsers();
  }, [fetchUsers]);

  const handleCustomerSaved = useCallback((prov: { email: string; password: string } | null) => {
    setCustomerEditorTarget(null);
    if (prov) setProvisional(prov);
    fetchUsers();
  }, [fetchUsers]);

  const userActions: RowAction<UserProfile>[] = useMemo(() => [
    {
      icon: () => IconEdit,
      tooltip: () => "Modifica",
      onClick: (u) => setUserEditorTarget({ mode: "edit", user: u }),
      hidden: (u) => !!u.deletedAt,
    },
    {
      icon: () => IconReset,
      tooltip: () => "Reset password",
      onClick: async (u) => {
        if (!window.confirm(`Resettare la password di ${u.nome}?`)) return;
        const res = await api.post<{ user: UserProfile; provisionalPassword: string }>(
          `/api/users/${u.id}/reset-password`
        );
        setProvisional({ email: u.email, password: res.provisionalPassword });
      },
      hidden: (u) => u.ruolo === "SUPERUSER" || !!u.deletedAt,
    },
    {
      icon: (u) => {
        if (u.stato === "BLOCCATO") return <span style={{ color: "var(--red)" }}>{IconLock}</span>;
        return IconLockOpen;
      },
      tooltip: (u) => u.stato === "ATTIVO" ? "Blocca" : "Sblocca",
      variant: "danger",
      onClick: async (u) => {
        const isBlock = u.stato === "ATTIVO";
        if (!window.confirm(`${isBlock ? "Bloccare" : "Sbloccare"} l'utente ${u.nome}?`)) return;
        const endpoint = isBlock
          ? `/api/users/${u.id}/block`
          : `/api/users/${u.id}/unblock`;
        await api.post(endpoint);
        fetchUsers();
      },
      hidden: (u) => u.ruolo === "SUPERUSER" || !!u.deletedAt,
    },
    {
      icon: () => IconTrash,
      tooltip: () => "Elimina",
      variant: "danger",
      onClick: async (u) => {
        if (!window.confirm(`Eliminare l'utente ${u.nome}?`)) return;
        await api.del(`/api/users/${u.id}`);
        fetchUsers();
      },
      hidden: (u) => u.ruolo === "SUPERUSER" || !!u.deletedAt,
    },
  ], [fetchUsers]);

  const customerActions: RowAction<CustomerProfile>[] = useMemo(() => [
    {
      icon: () => IconEdit,
      tooltip: () => "Modifica",
      onClick: (c) => setCustomerEditorTarget({ mode: "edit", user: c }),
    },
    {
      icon: () => IconReset,
      tooltip: () => "Reset password",
      onClick: async (c) => {
        if (!window.confirm(`Resettare la password di ${c.nome}?`)) return;
        const res = await api.post<{ customer: CustomerProfile; provisionalPassword: string }>(
          `/api/customers/${c.id}/reset-password`
        );
        setProvisional({ email: c.email, password: res.provisionalPassword });
      },
    },
  ], []);

  const userColumns: Column<UserProfile>[] = useMemo(() => [
    {
      key: "ruolo",
      header: "Ruolo",
      width: "150px",
      sortable: true,
      sortValue: (u) => u.ruolo,
      cell: (u) => {
        const labels: Record<string, string> = { SUPERUSER: "Super Admin", AMMINISTRATORE: "Amministratore", UTENTE: "Utente", SOSPESO: "Sospeso" };
        return <span className="admin-panel-role">{labels[u.ruolo] ?? u.ruolo}</span>;
      },
    },
    {
      key: "nome",
      header: "Nome",
      grow: true,
      sortable: true,
      sortValue: (u) => u.nome,
      cell: (u) => {
        const online = isOnline(u.id);
        return (
          <div className="user-cell-name">
            <span className="user-avatar" style={{ background: u.avatarColor, color: "#fff" }}>{u.nome.charAt(0).toUpperCase()}</span>
            <span className="cell-entity-title">{u.nome}</span>
            {u.deletedAt && <span className="user-status-dot deleted" />}
            {!u.deletedAt && <span className={`user-status-dot ${online ? "online" : "offline"}`} />}
          </div>
        );
      },
    },
    {
      key: "email",
      header: "Email",
      width: "220px",
      mono: true,
      sortable: true,
      sortValue: (u) => u.email,
      cell: (u) => u.email,
    },
    {
      key: "createdAt",
      header: "Creato il",
      width: "110px",
      mono: true,
      sortable: true,
      sortValue: (u) => u.createdAt as string,
      cell: (u) => formatDate(u.createdAt as string),
    },
  ], [isOnline]);

  const customerColumns: Column<CustomerProfile>[] = useMemo(() => [
    {
      key: "nome",
      header: "Nome",
      grow: true,
      sortable: true,
      sortValue: (c) => c.nome,
      cell: (c) => {
        return (
          <div className="user-cell-name">
            <span className="user-avatar" style={{ background: c.avatarColor, color: "#fff" }}>{c.nome.charAt(0).toUpperCase()}</span>
            <span className="cell-entity-title">{c.nome}</span>
            <span className="cell-subtitle">{c.ragioneSociale}</span>
          </div>
        );
      },
    },
    {
      key: "email",
      header: "Email",
      width: "220px",
      mono: true,
      sortable: true,
      sortValue: (c) => c.email,
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
  ], []);

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
        {activeTab === "utenti" && (
          <nav className="admin-panel-subnav">
            <button
              className={`admin-panel-subnav-item ${userSubTab === "panoramica" ? "active" : ""}`}
              onClick={() => setUserSubTab("panoramica")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
              Panoramica
            </button>
            <button
              className={`admin-panel-subnav-item ${userSubTab === "gruppi" ? "active" : ""}`}
              onClick={() => setUserSubTab("gruppi")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              Gruppi
            </button>
          </nav>
        )}
        <div className="admin-panel-content">
          {activeTab === "clienti" && (
            <>
              <div className="admin-panel-header">
                <div className="admin-panel-header-left">
                  <h2 className="admin-panel-title">Clienti</h2>
                  {data && <span className="admin-panel-count-badge">{data.total}</span>}
                </div>
                <div className="admin-panel-actions">
                  <div className="admin-panel-search">
                    {IconSearch}
                    <input
                      type="text"
                      placeholder="Cerca clienti..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <button
                    className="admin-btn admin-btn-primary admin-btn-sm"
                    onClick={() => setCustomerEditorTarget({ mode: "create" })}
                  >
                    {IconPlus}
                    Nuovo cliente
                  </button>
                </div>
              </div>
              {loading && <div className="admin-panel-loading">Caricamento...</div>}
              {error && <div className="admin-panel-error">{error}</div>}
              {!loading && !error && data && (
                <DataTable
                  columns={customerColumns as any}
                  rows={data.items}
                  rowKey={(r: any) => String(r.id)}
                  actions={customerActions as any}
                  emptyText="Nessun cliente trovato"
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={data.total}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
          {activeTab === "utenti" && userSubTab === "panoramica" && (
            <>
              <div className="admin-panel-header">
                <div className="admin-panel-header-left">
                  <h2 className="admin-panel-title">Utenti</h2>
                  {data && <span className="admin-panel-count-badge">{data.total}</span>}
                </div>
                <div className="admin-panel-actions">
                  <select
                    className="admin-panel-filter-select"
                    value={statoFilter}
                    onChange={(e) => { setStatoFilter(e.target.value as StatoFilter); setPage(1); }}
                  >
                    {STATO_FILTERS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <div className="admin-panel-search">
                    {IconSearch}
                    <input
                      type="text"
                      placeholder="Cerca utenti..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <button
                    className="admin-btn admin-btn-primary admin-btn-sm"
                    onClick={() => setUserEditorTarget({ mode: "create" })}
                  >
                    {IconPlus}
                    Nuovo utente
                  </button>
                </div>
              </div>
              {loading && <div className="admin-panel-loading">Caricamento...</div>}
              {error && <div className="admin-panel-error">{error}</div>}
              {!loading && !error && data && (
                <DataTable
                  columns={userColumns as any}
                  rows={data.items}
                  rowKey={(r: any) => String(r.id)}
                  actions={userActions as any}
                  emptyText="Nessun utente trovato"
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={data.total}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
          {activeTab === "utenti" && userSubTab === "gruppi" && (
            <GroupsSection />
          )}
        </div>
      </div>

      {userEditorTarget && (
        <UserAdminEditorModal
          target={userEditorTarget}
          onClose={() => setUserEditorTarget(null)}
          onSaved={handleUserSaved}
        />
      )}

      {customerEditorTarget && (
        <UserEditorModal
          target={customerEditorTarget}
          onClose={() => setCustomerEditorTarget(null)}
          onSaved={handleCustomerSaved}
        />
      )}

      {provisional && (
        <Modal title="Password provvisoria" size="sm" onClose={() => setProvisional(null)}>
          <p style={{ fontSize: 14, marginBottom: 16 }}>
            È stata inviata un&apos;email con la password provvisoria a:
          </p>
          <p className="mono" style={{ fontSize: 14, marginBottom: 20 }}>{provisional.email}</p>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setProvisional(null)}>Chiudi</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Sezione Gruppi (sotto-voce di Utenti) ──

function GroupsSection() {
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<"create" | PermissionGroup | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PermissionGroup[]>("/api/admin/groups");
      setGroups(res);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const filtered = search
    ? groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()) || g.slug.toLowerCase().includes(search.toLowerCase()))
    : groups;

  const groupColumns: Column<PermissionGroup>[] = [
    {
      key: "name",
      header: "Nome",
      grow: true,
      sortable: true,
      sortValue: (g) => g.name,
      cell: (g) => <span style={{ fontWeight: 500 }}>{g.name}</span>,
    },
    {
      key: "slug",
      header: "Slug",
      width: "160px",
      mono: true,
      sortable: true,
      sortValue: (g) => g.slug,
      cell: (g) => <span style={{ color: "var(--muted)" }}>{g.slug}</span>,
    },
    {
      key: "permissions",
      header: "Permessi",
      width: "100px",
      align: "center" as const,
      cell: (g) => <span className="admin-panel-role">{g.permissions.length}</span>,
    },
    {
      key: "users",
      header: "Utenti",
      width: "80px",
      align: "center" as const,
      cell: (g) => <span style={{ color: "var(--muted)" }}>{g._count.users}</span>,
    },
  ];

  const groupActions: RowAction<PermissionGroup>[] = [
    {
      icon: () => IconEdit,
      tooltip: () => "Modifica",
      onClick: (g) => setEditor(g),
    },
    {
      icon: () => IconTrash,
      tooltip: () => "Elimina",
      variant: "danger",
      onClick: (g) => {
        if (!window.confirm(`Eliminare il gruppo "${g.name}"?`)) return;
        api.del(`/api/admin/groups/${g.id}`).then(() => fetchGroups()).catch(() => {});
      },
    },
  ];

  return (
    <>
      <div className="admin-panel-header">
        <div className="admin-panel-header-left">
          <h2 className="admin-panel-title">Gruppi di permessi</h2>
          {!loading && <span className="admin-panel-count-badge">{filtered.length}</span>}
        </div>
        <div className="admin-panel-actions">
          <div className="admin-panel-search">
            {IconSearch}
            <input
              type="text"
              placeholder="Cerca gruppi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => setEditor("create")}>
            {IconPlus} Nuovo gruppo
          </button>
        </div>
      </div>

      {loading && <div className="admin-panel-loading">Caricamento...</div>}
      {!loading && (
        <DataTable
          columns={groupColumns}
          rows={filtered}
          rowKey={(g) => String(g.id)}
          actions={groupActions}
          emptyText={search ? "Nessun gruppo trovato" : "Nessun gruppo. Creane uno."}
          page={1}
          pageSize={filtered.length || 1}
          total={filtered.length}
          onPageChange={() => {}}
        />
      )}

      {editor && (
        <GroupEditorModal
          group={editor === "create" ? null : editor}
          onClose={() => setEditor(null)}
          onSaved={() => { setEditor(null); fetchGroups(); }}
        />
      )}
    </>
  );
}

// ── Modale creazione/modifica gruppo ──

function GroupEditorModal({
  group,
  onClose,
  onSaved,
}: {
  group: PermissionGroup | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(group?.name ?? "");
  const [slug, setSlug] = useState(group?.slug ?? "");
  const [permissions, setPermissions] = useState<string[]>(group?.permissions ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) { setError("Nome e slug sono obbligatori"); return; }
    if (permissions.length === 0) { setError("Seleziona almeno un permesso"); return; }
    setBusy(true);
    setError(null);
    try {
      if (group) {
        await api.put(`/api/admin/groups/${group.id}`, { name: name.trim(), slug: slug.trim(), permissions });
      } else {
        await api.post("/api/admin/groups", { name: name.trim(), slug: slug.trim(), permissions });
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore salvataggio");
      setBusy(false);
    }
  }

  function togglePermission(key: string) {
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  }

  return (
    <div className="modal-backdrop" style={{ zIndex: 10000 }} onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>
          {group ? "Modifica gruppo" : "Nuovo gruppo"}
        </h2>
        <form onSubmit={onSubmit}>
          {error && <div className="error-box" style={{ marginBottom: 12 }}>{error}</div>}
          <label htmlFor="ge-name">Nome</label>
          <input id="ge-name" required value={name} onChange={(e) => setName(e.target.value)} />
          <label htmlFor="ge-slug">Slug</label>
          <input id="ge-slug" required value={slug} onChange={(e) => setSlug(e.target.value)} style={{ fontFamily: "var(--font-mono)", fontSize: 13 }} />
          <label style={{ marginTop: 16, display: "block", fontWeight: 500 }}>Permessi</label>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4, maxHeight: 280, overflow: "auto", border: "1px solid var(--border)", borderRadius: 8, padding: 8 }}>
            {ALL_PERMISSIONS.map((p) => (
              <label key={p.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 4px", borderRadius: 4, cursor: "pointer", fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={permissions.includes(p.key)}
                  onChange={() => togglePermission(p.key)}
                  style={{ width: "auto" }}
                />
                <code style={{ fontSize: 12, color: "var(--muted)", minWidth: 180 }}>{p.key}</code>
                {p.label}
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button type="button" onClick={onClose}>Annulla</button>
            <button className="primary" disabled={busy}>
              {busy ? "Salvataggio..." : group ? "Salva modifiche" : "Crea gruppo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
