"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../../lib/api";
import { IconRefresh } from "./icons";

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
  if (!status) return <span className="badge" style={{ background: "var(--fg-soft)", color: "var(--muted)" }}>Mai eseguito</span>;
  if (status === "ok") return <span className="badge" style={{ background: "oklch(94% 0.04 150)", color: "var(--ok)" }}>OK</span>;
  return <span className="badge" style={{ background: "oklch(94% 0.05 25)", color: "var(--danger)" }}>ERRORE</span>;
}

function LogStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    ok: { label: "OK", bg: "oklch(94% 0.04 150)", fg: "var(--ok)" },
    error: { label: "ERRORE", bg: "oklch(94% 0.05 25)", fg: "var(--danger)" },
    running: { label: "IN CORSO", bg: "oklch(94% 0.06 250)", fg: "var(--accent)" },
    stale: { label: "INTERROTTO", bg: "var(--fg-soft)", fg: "var(--muted)" },
  };
  const s = map[status] ?? { label: status, bg: "var(--fg-soft)", fg: "var(--muted)" };
  return <span className="badge" style={{ background: s.bg, color: s.fg }}>{s.label}</span>;
}

export default function SyncPanel() {
  const [configs, setConfigs] = useState<SyncConfigRow[]>([]);
  const [logs, setLogs] = useState<SyncLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [editingCron, setEditingCron] = useState<string | null>(null);
  const [cronDraft, setCronDraft] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchData = useCallback(async () => {
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
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 5000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

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

  if (loading) return <div className="admin-panel-loading">Caricamento...</div>;
  if (error) return <div className="admin-panel-error">{error}</div>;

  return (
    <>
      <div className="admin-panel-header">
        <div className="admin-panel-header-left">
          <h2 className="admin-panel-title">Sincronizzazione Integra</h2>
          <span className="admin-panel-count-badge">{configs.length}</span>
        </div>
      </div>

      <div className="data-table-scroll" style={{ marginBottom: 32 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Entit&agrave;</th>
              <th>Stato</th>
              <th>Attivo</th>
              <th>Cron</th>
              <th>Ultima esecuzione</th>
              <th>Prossima esecuzione</th>
              <th style={{ width: 100 }} />
            </tr>
          </thead>
          <tbody>
            {configs.map((row) => (
              <tr key={row.tipo}>
                <td style={{ fontWeight: 500 }}>{row.label}</td>
                <td><StatusBadge status={row.ultimo_esito} /></td>
                <td>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={row.attivo}
                      onChange={() => toggleActive(row)}
                      style={{ width: 16, height: 16 }}
                    />
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>{row.attivo ? "Sì" : "No"}</span>
                  </label>
                </td>
                <td className="mono" style={{ fontSize: 13 }}>
                  {editingCron === row.tipo ? (
                    <input
                      autoFocus
                      type="text"
                      value={cronDraft}
                      onChange={(e) => setCronDraft(e.target.value)}
                      onBlur={() => saveCron(row)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveCron(row); if (e.key === "Escape") setEditingCron(null); }}
                      style={{ fontFamily: "var(--font-mono)", fontSize: 13, padding: "2px 6px", width: 160 }}
                    />
                  ) : (
                    <span
                      onClick={() => { setEditingCron(row.tipo); setCronDraft(row.cron_expression); }}
                      style={{ cursor: "pointer", padding: "2px 6px", borderRadius: 4, border: "1px solid transparent" }}
                      title="Clicca per modificare"
                    >
                      {row.cron_expression}
                    </span>
                  )}
                </td>
                <td className="mono" style={{ fontSize: 13 }}>{formatDateTime(row.ultima_esecuzione)}</td>
                <td className="mono" style={{ fontSize: 13 }}>{formatDateTime(row.prossima_esecuzione)}</td>
                <td>
                  <button
                    className="admin-btn admin-btn-secondary"
                    style={{ minWidth: 110, justifyContent: "center" }}
                    disabled={triggering === row.tipo}
                    onClick={() => triggerSync(row.tipo)}
                  >
                    <span className={`sync-icon ${triggering === row.tipo ? "spin" : ""}`}>{IconRefresh}</span>
                    <span>{triggering === row.tipo ? "Esecuzione…" : "Esegui"}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {configs.some((c) => c.ultimo_errore) && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px", color: "var(--danger)" }}>Ultimi errori</h3>
          {configs.filter((c) => c.ultimo_errore).map((c) => (
            <div key={c.tipo} style={{ fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontWeight: 500, marginRight: 8 }}>{c.label}:</span>
              <span style={{ color: "var(--danger)" }}>{c.ultimo_errore}</span>
            </div>
          ))}
        </div>
      )}

      <div className="admin-panel-header" style={{ marginTop: 8 }}>
        <div className="admin-panel-header-left">
          <h2 className="admin-panel-title" style={{ fontSize: 15 }}>Log sincronizzazioni</h2>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="data-table-empty">Nessun log disponibile</div>
      ) : (
        <div className="data-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Entit&agrave;</th>
                <th>Stato</th>
                <th>Righe</th>
                <th>OK</th>
                <th>Errori</th>
                <th>Inizio</th>
                <th>Fine</th>
                <th>Durata</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontWeight: 500 }}>{log.entity}</td>
                  <td><LogStatusBadge status={log.status} /></td>
                  <td className="mono" style={{ fontSize: 13 }}>{log.rows_total ?? "-"}</td>
                  <td className="mono" style={{ fontSize: 13 }}>{log.rows_ok ?? "-"}</td>
                  <td className="mono" style={{ fontSize: 13, color: (log.rows_error ?? 0) > 0 ? "var(--danger)" : undefined }}>{log.rows_error ?? "-"}</td>
                  <td className="mono" style={{ fontSize: 13 }}>{formatDateTime(log.started_at)}</td>
                  <td className="mono" style={{ fontSize: 13 }}>{formatDateTime(log.completed_at)}</td>
                  <td className="mono" style={{ fontSize: 13 }}>{formatDuration(log.started_at, log.completed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {logs.some((l) => l.error_text) && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px", color: "var(--danger)" }}>Dettagli errori recenti</h3>
          {logs.filter((l) => l.error_text).slice(0, 10).map((l) => (
            <div key={l.id} style={{ fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontWeight: 500, marginRight: 8 }}>{l.entity}</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--muted)", marginRight: 8 }}>{formatDateTime(l.started_at)}</span>
              <span style={{ color: "var(--danger)" }}>{l.error_text}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
