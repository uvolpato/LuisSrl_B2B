"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import AdminTopBar from "../AdminTopBar";
import DataTable from "../DataTable";
import type { Column, RowAction } from "../DataTable";
import { api, ApiError } from "../../../lib/api";
import EventDetailModal from "./EventDetailModal";
import EventTimelineModal from "./EventTimelineModal";

interface EventLogItem {
  id: string;
  azione: string;
  actorId: number | null;
  actorType: string | null;
  entita: string | null;
  entitaId: string | null;
  dettagli: any;
  esito: string;
  ip: string | null;
  requestId: string | null;
  durationMs: number | null;
  createdAt: string;
}

interface Stats {
  total24h: number;
  error24h: number;
  access24h: number;
  avgDurationMs: number;
}

interface PageData {
  items: EventLogItem[];
  total: number;
  page: number;
  limit: number;
}

function categoriaDi(e: { azione: string }): "access" | "error" | "audit" {
  if (e.azione === "http.access") return "access";
  if (e.azione === "http.error") return "error";
  return "audit";
}

const TYPE_CLS: Record<string, string> = {
  access: "type-access",
  error: "type-error",
  audit: "type-mutation",
};

const EVENT_TYPES = [
  { value: "", label: "Tutti" },
  { value: "access", label: "Access" },
  { value: "error", label: "Error" },
  { value: "audit", label: "Audit" },
];

function fmtDt(d: string): string {
  return new Date(d).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function EventLogSection() {
  const today = new Date().toISOString().slice(0, 10);
  const [stats, setStats] = useState<Stats | null>(null);
  const [items, setItems] = useState<EventLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categoria, setCategoria] = useState("");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<EventLogItem | null>(null);
  const [timelineEntity, setTimelineEntity] = useState<{ entity: string; entityId: string } | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (categoria) params.set("categoria", categoria);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (search) params.set("search", search);
      const [s, d] = await Promise.all([
        api.get<Stats>("/api/admin/audit/stats"),
        api.get<PageData>(`/api/admin/audit?${params}`),
      ]);
      setStats(s);
      setItems(d.items);
      setTotal(d.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "errors.generic");
    }
    setLoading(false);
  }, [page, categoria, dateFrom, dateTo, search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(1); }, [categoria, dateFrom, dateTo, search]);

  const columns: Column<EventLogItem>[] = useMemo(() => [
    { key: "azione", header: "Tipo", width: "90px", cell: (e) => <span className={`type-badge ${TYPE_CLS[categoriaDi(e)] ?? ""}`} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, fontFamily: "var(--font-mono)", textTransform: "uppercase", fontWeight: 600 }}>{categoriaDi(e)}</span> },
    { key: "label", header: "Azione", grow: true, cell: (e) => <span style={{ fontSize: 13 }}>{e.dettagli?.label ?? e.azione}</span> },
    { key: "entity", header: "Entità", width: "130px", mono: true, cell: (e) => e.entita ? <span style={{ fontSize: 12 }}>{e.entita}/{e.entitaId}</span> : "—" },
    { key: "actorId", header: "Utente", width: "100px", cell: (e) => { const t = e.actorType === 'admin' ? 'admin' : e.actorType === 'customer' ? 'cli' : ''; return e.actorId ? <span style={{ fontSize: 12 }}>{t}#{e.actorId}</span> : "—"; } },
    { key: "createdAt", header: "Data", width: "130px", mono: true, cell: (e) => <span style={{ fontSize: 12 }}>{fmtDt(e.createdAt)}</span> },
  ], []);

  const actions: RowAction<EventLogItem>[] = useMemo(() => [
    {
      icon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
      tooltip: () => "Dettaglio",
      onClick: (e) => setDetail(e),
    },
    {
      icon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
      tooltip: () => "Timeline",
      onClick: (e) => { if (e.entita && e.entitaId) setTimelineEntity({ entity: e.entita, entityId: e.entitaId }); },
      hidden: (e) => !e.entita || !e.entitaId,
    },
  ], []);

  return (
    <>
      <AdminTopBar title="Log eventi" searchValue={search} onSearchChange={setSearch} searchPlaceholder="Cerca azione, entità..."
        filter={categoria} onFilterChange={setCategoria} filterOptions={EVENT_TYPES}
        leading={
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="date" className="date-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: "8px 10px", fontSize: 13 }} />
            <span style={{ color: "var(--muted)", fontSize: 13 }}>→</span>
            <input type="date" className="date-input" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: "8px 10px", fontSize: 13 }} />
          </div>
        }
      />

      <div className="admin-content">
        {error && <div style={{ color: "var(--red)", marginBottom: 12 }}>{error}</div>}

        {stats && (
          <div className="dash-grid">
            <div className="dash-card"><div className="label">Eventi 24h</div><div className="value">{stats.total24h.toLocaleString("it-IT")}</div></div>
            <div className="dash-card"><div className="label">Errori 24h</div><div className="value" style={{ color: "var(--red)" }}>{stats.error24h}</div></div>
            <div className="dash-card"><div className="label">Richieste 24h</div><div className="value">{stats.access24h.toLocaleString("it-IT")}</div></div>
            <div className="dash-card"><div className="label">Tempo medio</div><div className="value">{stats.avgDurationMs}ms</div></div>
          </div>
        )}

        <DataTable
          columns={columns}
          rows={items}
          rowKey={(e) => e.id}
          actions={actions}
          emptyText="Nessun evento trovato con questi filtri."
          loading={loading}
          page={page}
          pageSize={10}
          total={total}
          onPageChange={setPage}
        />
      </div>

      {detail && <EventDetailModal event={detail} onClose={() => setDetail(null)} />}
      {timelineEntity && (
        <EventTimelineModal entity={timelineEntity.entity} entityId={timelineEntity.entityId} onClose={() => setTimelineEntity(null)} />
      )}
    </>
  );
}
