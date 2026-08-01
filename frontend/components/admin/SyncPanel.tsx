"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { api } from "../../lib/api";
import { IconEye, IconRefresh } from "./icons";
import Notice from "../common/Notice";
import DataTable, { type Column } from "./DataTable";
import Modal from "../common/Modal";

interface SyncConfigRow {
  tipo: string;
  label: string;
  cron_expression: string;
  attivo: boolean;
  solo_manuale: boolean;
  ultima_esecuzione: string | null;
  ultimo_esito: string | null;
  ultimo_errore: string | null;
  prossima_esecuzione: string | null;
}

interface SyncLogRow {
  id: number;
  entity: string;
  status: string;
  rows_total: number | null;
  rows_ok: number | null;
  rows_error: number | null;
  error_text: string | null;
  started_at: string;
  completed_at: string | null;
}

function formatDateTime(d: string | null): string {
  if (!d) return "-";
  const dt = new Date(d);
  return dt.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "in corso";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="badge">Mai eseguito</span>;
  if (status === "ok") return <span className="badge active">OK</span>;
  return <span className="badge blocked">Errore</span>;
}

function LogStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ok: { label: "OK", cls: "active" },
    error: { label: "Errore", cls: "blocked" },
    running: { label: "In corso", cls: "pending" },
    stale: { label: "Interrotto", cls: "" },
  };
  const s = map[status] ?? { label: status, cls: "" };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

const LOG_PAGE_SIZE = 10;

export default function SyncPanel() {
  const [configs, setConfigs] = useState<SyncConfigRow[]>([]);
  const [logs, setLogs] = useState<SyncLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [editingCron, setEditingCron] = useState<string | null>(null);
  const [cronDraft, setCronDraft] = useState("");
  const [logPage, setLogPage] = useState(1);
  const [logFilter, setLogFilter] = useState<string>("tutti");
  const [activeTab, setActiveTab] = useState<"sync" | "logs">("sync");
  const [detailLog, setDetailLog] = useState<SyncLogRow | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [cfg, log] = await Promise.all([
        api.get<SyncConfigRow[]>("/api/integrazione/sync-config"),
        api.get<SyncLogRow[]>("/api/integrazione/sync-logs?limit=50"),
      ]);
      setConfigs(cfg);
      setLogs(log);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore caricamento");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(() => fetchData(), 5000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  useEffect(() => {
    setLogPage(1);
  }, [logFilter, logs.length]);

  async function toggleActive(row: SyncConfigRow) {
    const prev = configs;
    setConfigs((cs) => cs.map((c) => c.tipo === row.tipo ? { ...c, attivo: !c.attivo } : c));
    try {
      await api.put(`/api/integrazione/sync-config/${row.tipo}`, { attivo: !row.attivo });
    } catch {
      setConfigs(prev);
    }
  }

  async function saveCron(row: SyncConfigRow) {
    setEditingCron(null);
    if (cronDraft === row.cron_expression) return;
    const prev = row.cron_expression;
    setConfigs((cs) => cs.map((c) => c.tipo === row.tipo ? { ...c, cron_expression: cronDraft } : c));
    try {
      await api.put(`/api/integrazione/sync-config/${row.tipo}`, { cron_expression: cronDraft });
    } catch {
      setConfigs((cs) => cs.map((c) => c.tipo === row.tipo ? { ...c, cron_expression: prev } : c));
    }
  }

  async function triggerSync(tipo: string) {
    setTriggering(tipo);
    try {
      await api.post(`/api/integrazione/sync-config/${tipo}/trigger`);
      await fetchData();
    } catch { /* refresh will pick it up */ }
    setTriggering(null);
  }

  const stats = useMemo(() => {
    const attive = configs.filter((c) => c.attivo).length;
    const inErrore = configs.filter((c) => c.ultimo_esito === "error").length;
    const inCorso = logs.filter((l) => l.status === "running").length;
    const erroriLog = logs.reduce((n, l) => n + (l.rows_error ?? 0), 0);
    return { attive, inErrore, inCorso, erroriLog };
  }, [configs, logs]);

  const filteredLogs = useMemo(
    () => logFilter === "tutti" ? logs : logs.filter((l) => l.status === logFilter),
    [logs, logFilter],
  );

  const configColumns: Column<SyncConfigRow>[] = [
    {
      key: "label",
      header: "Entità",
      grow: true,
      cell: (r) => <span style={{ fontWeight: 500 }}>{r.label}</span>,
    },
    {
      key: "stato",
      header: "Stato",
      width: "130px",
      cell: (r) => <StatusBadge status={r.ultimo_esito} />,
    },
    {
      key: "attivo",
      header: "Attivo",
      width: "80px",
      align: "center",
      cell: (r) => (
        <label className="sync-switch" title={r.attivo ? "Disattiva sincronizzazione" : "Attiva sincronizzazione"}>
          <input type="checkbox" checked={r.attivo} onChange={() => toggleActive(r)} />
          <span className="track" />
          <span className="thumb" />
        </label>
      ),
    },
    {
      key: "cron",
      header: "Cron",
      width: "170px",
      mono: true,
      cell: (r) =>
        editingCron === r.tipo ? (
          <input
            autoFocus
            type="text"
            value={cronDraft}
            onChange={(e) => setCronDraft(e.target.value)}
            onBlur={() => saveCron(r)}
            onKeyDown={(e) => { if (e.key === "Enter") saveCron(r); if (e.key === "Escape") setEditingCron(null); }}
            style={{ fontFamily: "var(--font-mono)", fontSize: 13, padding: "2px 6px", width: "100%" }}
          />
        ) : (
          <span
            onClick={() => { setEditingCron(r.tipo); setCronDraft(r.cron_expression); }}
            style={{ cursor: "pointer", padding: "2px 6px", borderRadius: 4, border: "1px solid transparent" }}
            title="Clicca per modificare"
          >
            {r.cron_expression}
          </span>
        ),
    },
    {
      key: "ultima_esecuzione",
      header: "Ultima esecuzione",
      width: "150px",
      mono: true,
      cell: (r) => formatDateTime(r.ultima_esecuzione),
    },
    {
      key: "prossima_esecuzione",
      header: "Prossima esecuzione",
      width: "150px",
      mono: true,
      cell: (r) => formatDateTime(r.prossima_esecuzione),
    },
    {
      key: "esegui",
      header: "",
      width: "120px",
      align: "right",
      cell: (r) => (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ justifyContent: "center", width: "100%" }}
          disabled={triggering === r.tipo}
          onClick={() => triggerSync(r.tipo)}
        >
          <span className={`sync-icon ${triggering === r.tipo ? "spin" : ""}`}>{IconRefresh}</span>
          <span>{triggering === r.tipo ? "Esecuzione…" : "Esegui"}</span>
        </button>
      ),
    },
  ];

  const logColumns: Column<SyncLogRow>[] = [
    {
      key: "entity",
      header: "Entità",
      grow: true,
      cell: (r) => <span style={{ fontWeight: 500 }}>{r.entity}</span>,
    },
    {
      key: "status",
      header: "Stato",
      width: "120px",
      cell: (r) => <LogStatusBadge status={r.status} />,
    },
    {
      key: "rows_total",
      header: "Righe",
      width: "70px",
      align: "right",
      mono: true,
      cell: (r) => r.rows_total ?? "-",
    },
    {
      key: "rows_ok",
      header: "OK",
      width: "60px",
      align: "right",
      mono: true,
      cell: (r) => r.rows_ok ?? "-",
    },
    {
      key: "rows_error",
      header: "Errori",
      width: "70px",
      align: "right",
      mono: true,
      cell: (r) => (r.rows_error ?? 0) > 0 ? <span style={{ color: "var(--danger)" }}>{r.rows_error ?? "-"}</span> : (r.rows_error ?? "-"),
    },
    {
      key: "started_at",
      header: "Inizio",
      width: "150px",
      mono: true,
      cell: (r) => formatDateTime(r.started_at),
    },
    {
      key: "completed_at",
      header: "Fine",
      width: "150px",
      mono: true,
      cell: (r) => formatDateTime(r.completed_at),
    },
    {
      key: "durata",
      header: "Durata",
      width: "90px",
      mono: true,
      cell: (r) => formatDuration(r.started_at, r.completed_at),
    },
    {
      key: "dettagli",
      header: "",
      width: "120px",
      align: "right",
      cell: (r) => r.error_text ? (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ justifyContent: "center", width: "100%" }}
          onClick={() => setDetailLog(r)}
        >
          <span>{IconEye}</span>
          <span>Dettagli</span>
        </button>
      ) : null,
    },
  ];

  if (loading && configs.length === 0) return <div className="admin-panel-loading">Caricamento...</div>;
  if (error && configs.length === 0) return <div className="admin-panel-error">{error}</div>;

  return (
    <div className="sync-panel">
      <div className="admin-panel-header">
        <div className="admin-panel-header-left">
          <h2 className="admin-panel-title">Sincronizzazione Integra</h2>
          <span className="admin-panel-count-badge">{configs.length}</span>
        </div>
        <div className="admin-panel-actions">
          <span className="meta" style={{ fontSize: 12 }}>
            {refreshing ? "Aggiornamento…" : "Auto-aggiorna ogni 5s"}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <span className={`sync-icon ${refreshing ? "spin" : ""}`}>{IconRefresh}</span>
            <span>Aggiorna</span>
          </button>
        </div>
      </div>

      {error && <Notice variant="error" onClose={() => setError(null)}>{error}</Notice>}

      <div className="sync-stats">
        <div className="sync-stat">
          <span className="sync-stat-label">Entità attive</span>
          <span className="sync-stat-value">{stats.attive}<span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 500 }}>/{configs.length}</span></span>
        </div>
        <div className="sync-stat">
          <span className="sync-stat-label">In errore</span>
          <span className={`sync-stat-value ${stats.inErrore > 0 ? "err" : "ok"}`}>
            {stats.inErrore > 0 && <span className="dot" />}
            {stats.inErrore}
          </span>
        </div>
        <div className="sync-stat">
          <span className="sync-stat-label">Sincronizzazioni in corso</span>
          <span className={`sync-stat-value ${stats.inCorso > 0 ? "ok" : ""}`}>
            {stats.inCorso > 0 && <span className="dot" />}
            {stats.inCorso}
          </span>
        </div>
        <div className="sync-stat">
          <span className="sync-stat-label">Errori negli ultimi log</span>
          <span className={`sync-stat-value ${stats.erroriLog > 0 ? "err" : "ok"}`}>
            {stats.erroriLog > 0 && <span className="dot" />}
            {stats.erroriLog}
          </span>
        </div>
      </div>

      <div className="admin-panel-tabs" style={{ marginBottom: 5 }}>
        <button
          type="button"
          className={`admin-panel-tab ${activeTab === "sync" ? "active" : ""}`}
          onClick={() => setActiveTab("sync")}
        >
          Sincronizzazioni
        </button>
        <button
          type="button"
          className={`admin-panel-tab ${activeTab === "logs" ? "active" : ""}`}
          onClick={() => setActiveTab("logs")}
        >
          Log
        </button>
      </div>

      {activeTab === "sync" && (
        <>
          <DataTable
            columns={configColumns}
            rows={configs}
            rowKey={(r) => r.tipo}
            emptyText="Nessuna entità di sincronizzazione configurata"
            loading={loading}
            page={1}
            pageSize={Math.max(configs.length, 1)}
            total={configs.length}
            onPageChange={() => {}}
          />
        </>
      )}

      {activeTab === "logs" && (
        <>
          <div className="admin-panel-header sync-logs-header">
            <div className="admin-panel-header-left">
              <h2 className="admin-panel-title" style={{ fontSize: 15 }}>Log sincronizzazioni</h2>
              <span className="admin-panel-count-badge">{filteredLogs.length}</span>
            </div>
            <div className="admin-panel-actions">
              <div className="filter-pills">
                {[{ value: "tutti", label: "Tutti" }, { value: "ok", label: "OK" }, { value: "error", label: "Errori" }, { value: "running", label: "In corso" }].map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    className={`filter-pill ${logFilter === f.value ? "active" : ""}`}
                    onClick={() => setLogFilter(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DataTable
            columns={logColumns}
            rows={filteredLogs.slice((logPage - 1) * LOG_PAGE_SIZE, logPage * LOG_PAGE_SIZE)}
            rowKey={(r) => r.id}
            emptyText={logFilter === "tutti" ? "Nessun log disponibile" : "Nessun log con questo stato"}
            loading={loading}
            page={logPage}
            pageSize={LOG_PAGE_SIZE}
            total={filteredLogs.length}
            onPageChange={setLogPage}
          />
        </>
      )}

      <Modal
        open={!!detailLog}
        size="md"
        title={detailLog ? `Errore — ${detailLog.entity}` : ""}
        onClose={() => setDetailLog(null)}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn btn-primary" onClick={() => setDetailLog(null)}>Chiudi</button>
          </div>
        }
      >
        {detailLog && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>Stato</div>
                <div><LogStatusBadge status={detailLog.status} /></div>
              </div>
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>Righe</div>
                <div className="mono" style={{ fontSize: 14 }}>{detailLog.rows_total ?? "-"} totali · {detailLog.rows_ok ?? "-"} ok · <span style={{ color: "var(--danger)" }}>{detailLog.rows_error ?? "-"} errori</span></div>
              </div>
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>Inizio</div>
                <div className="mono" style={{ fontSize: 14 }}>{formatDateTime(detailLog.started_at)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>Fine · Durata</div>
                <div className="mono" style={{ fontSize: 14 }}>{formatDateTime(detailLog.completed_at)} · {formatDuration(detailLog.started_at, detailLog.completed_at)}</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 6 }}>Messaggio d'errore</div>
              <pre
                style={{
                  margin: 0, padding: "10px 12px", borderRadius: 8,
                  background: "color-mix(in srgb, var(--danger) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)",
                  color: "var(--danger)", whiteSpace: "pre-wrap", wordBreak: "break-word",
                  fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: 1.5,
                }}
              >
                {detailLog.error_text}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
