"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import AdminTopBar from "../AdminTopBar";
import DataTable from "../DataTable";
import type { Column, RowAction } from "../DataTable";
import { api, ApiError } from "../../../lib/api";
import { formatPrice } from "../../../lib/helpers";
import Notice from "../../common/Notice";
import CouponEditorModal from "./CouponEditorModal";
import CouponReviewModal from "./CouponReviewModal";

interface Campaign {
  id: number;
  code: string;
  name: string;
  type: string;
  value: number;
  scope: string;
  scopeDetail: string | null;
  minOrder: number | null;
  usage: string;
  validFrom: string;
  validTo: string | null;
  status: string;
  targetCount: number;
  usedCount: number;
  customerIds: number[];
}

interface Dashboard {
  activeCount: number;
  totalUsed: number;
  totalVolume: number;
  redemptionRate: number;
}

const STATUS_LABEL: Record<string, string> = { active: "Attiva", scheduled: "Programmata", expired: "Scaduta", paused: "In pausa" };
const STATUS_CLS: Record<string, string> = { active: "st-ok", scheduled: "st-blue", expired: "st-muted", paused: "st-amber" };
const TYPE_LABEL: Record<string, string> = { pct: "%", fixed: "€", "free-ship": "Sped.gratis" };
const USAGE_LABEL: Record<string, string> = { unlimited: "Illimitato", once: "Una volta", single: "Mono-uso" };

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function typeDisplay(t: string, v: number): string {
  if (t === "pct") return `−${v}%`;
  if (t === "fixed") return `−${formatPrice(v)}`;
  return "Spedizione gratuita";
}

export default function CouponSection() {
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<any>(null);
  const [reviewData, setReviewData] = useState<any>(null);

  async function handleDelete(id: number) {
    try { await api.del(`/api/admin/coupon/${id}`); fetchAll(); } catch {}
  }

  async function handleStatus(id: number, newStatus: string) {
    try { await api.patch(`/api/admin/coupon/${id}/status`, { status: newStatus }); fetchAll(); } catch {}
  }

  const actions: RowAction<Campaign>[] = useMemo(() => [
    {
      icon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
      tooltip: () => "Modifica",
      onClick: (c) => { setEditCampaign(c); setEditorOpen(true); },
    },
    {
      icon: (c) => c.status === "active" ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
      tooltip: (c) => c.status === "active" ? "Sospendi" : "Riattiva",
      onClick: (c) => { handleStatus(c.id, c.status === "active" ? "paused" : "active"); },
      hidden: (c) => c.status === "expired",
    },
    {
      icon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
      tooltip: () => "Elimina",
      onClick: (c) => handleDelete(c.id),
      variant: "danger",
    },
  ], []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const [d, c] = await Promise.all([
        api.get<Dashboard>("/api/admin/coupon/dashboard"),
        api.get<Campaign[]>(`/api/admin/coupon?${params}`),
      ]);
      setDash(d);
      setCampaigns(c);
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "errors.generic");
    }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const columns: Column<Campaign>[] = useMemo(() => [
    { key: "code", header: "Codice", width: "140px", mono: true, sortable: true, cell: (c) => <span style={{ fontWeight: 600, color: "var(--accent)" }}>{c.code}</span> },
    { key: "name", header: "Campagna", grow: true, sortable: true, cell: (c) => c.name },
    { key: "scope", header: "Ambito", width: "140px", sortable: true, sortValue: (c) => c.scope === "all" ? "Tutto" : (c.scopeDetail || c.scope), cell: (c) => c.scope === "all" ? "Tutto" : (c.scopeDetail || c.scope) },
    { key: "usedCount", header: "Utilizzi", width: "100px", align: "right", mono: true, sortable: true, sortValue: (c) => c.usedCount, cell: (c) => String(c.usedCount) },
    { key: "validFrom", header: "Validità", width: "140px", sortable: true, sortValue: (c) => c.validFrom, cell: (c) => <span style={{ fontSize: 12 }}>{fmtDate(c.validFrom)} → {fmtDate(c.validTo)}</span> },
    { key: "targetCount", header: "Target", width: "110px", sortable: true, sortValue: (c) => c.targetCount, cell: (c) => <span style={{ fontSize: 12 }}>{c.targetCount} clienti</span> },
    { key: "status", header: "Stato", width: "110px", sortable: true, sortValue: (c) => STATUS_LABEL[c.status] ?? c.status, cell: (c) => <span className={`status-pill ${STATUS_CLS[c.status] ?? "st-muted"}`}><span className="sd">●</span>{STATUS_LABEL[c.status] ?? c.status}</span> },
  ], []);

  const sortedCampaigns = useMemo(() => {
    if (!sortKey) return campaigns;
    return [...campaigns].sort((a: any, b: any) => {
      const col = columns.find(c => c.key === sortKey);
      const va = col?.sortValue ? col.sortValue(a) : (a[sortKey] ?? "");
      const vb = col?.sortValue ? col.sortValue(b) : (b[sortKey] ?? "");
      const n = typeof va === "string" ? va.localeCompare(String(vb)) : Number(va) - Number(vb);
      return sortDir === "desc" ? -n : n;
    });
  }, [campaigns, sortKey, sortDir, columns]);

  return (
    <>
      <AdminTopBar title="Coupon e campagne" searchValue={search} onSearchChange={setSearch} searchPlaceholder="Cerca campagna..."
        filter={statusFilter} onFilterChange={setStatusFilter}
        filterOptions={[
          { value: "", label: "Tutti" },
          { value: "active", label: "Attivi" },
          { value: "scheduled", label: "Programmati" },
          { value: "expired", label: "Scaduti" },
        ]}>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditCampaign(null); setEditorOpen(true); }} style={{ paddingBlock: 9 }}>+ Nuova campagna</button>
      </AdminTopBar>

      <div className="admin-content">
        {error && <Notice variant="error" onClose={() => setError(null)}>{error}</Notice>}

        {dash && (
          <div className="dash-grid">
            <div className="dash-card">
              <div className="label">Coupon attivi</div>
              <div className="value">{dash.activeCount}</div>
            </div>
            <div className="dash-card">
              <div className="label">Utilizzi totali</div>
              <div className="value">{dash.totalUsed.toLocaleString("it-IT")}</div>
              <div className="sub">ultimi 30 giorni</div>
            </div>
            <div className="dash-card">
              <div className="label">Volume scontato</div>
              <div className="value">{formatPrice(dash.totalVolume)}</div>
              <div className="sub">risparmio clienti</div>
            </div>
            <div className="dash-card">
              <div className="label">Tasso riscatto</div>
              <div className="value green">{dash.redemptionRate.toFixed(1).replace(".", ",")}%</div>
              <div className="sub">codici usati / inviati</div>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          rows={sortedCampaigns}
          rowKey={(c) => c.id}
          actions={actions}
          emptyText="Nessuna campagna trovata"
          loading={loading}
          page={1}
          pageSize={sortedCampaigns.length || 1}
          total={sortedCampaigns.length}
          onPageChange={() => {}}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={(key, dir) => { setSortKey(key); setSortDir(dir); }}
        />

      </div>

      {editorOpen && (
        <CouponEditorModal
          initial={editCampaign}
          onClose={() => { setEditorOpen(false); setEditCampaign(null); }}
          onSaved={() => { setEditorOpen(false); setEditCampaign(null); fetchAll(); }}
        />
      )}

      {reviewData && (
        <CouponReviewModal
          data={reviewData}
          onBack={() => { setReviewData(null); setEditorOpen(true); }}
          onClose={() => setReviewData(null)}
          onSent={() => { setReviewData(null); fetchAll(); }}
        />
      )}
    </>
  );
}
