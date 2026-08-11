"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import AdminTopBar from "../AdminTopBar";
import DataTable from "../DataTable";
import type { Column } from "../DataTable";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [reviewData, setReviewData] = useState<any>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
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
  }, [search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const columns: Column<Campaign>[] = useMemo(() => [
    { key: "code", header: "Codice", width: "140px", mono: true, cell: (c) => <span style={{ fontWeight: 600, color: "var(--accent)" }}>{c.code}</span> },
    { key: "name", header: "Campagna", grow: true, cell: (c) => c.name },
    { key: "scope", header: "Ambito", width: "140px", cell: (c) => c.scope === "all" ? "Tutto" : (c.scopeDetail || c.scope) },
    { key: "used", header: "Utilizzi", width: "100px", align: "right", mono: true, cell: (c) => String(c.usedCount) },
    { key: "validity", header: "Validità", width: "140px", cell: (c) => <span style={{ fontSize: 12 }}>{fmtDate(c.validFrom)} → {fmtDate(c.validTo)}</span> },
    { key: "target", header: "Target", width: "110px", cell: (c) => <span style={{ fontSize: 12 }}>{c.targetCount} clienti</span> },
    { key: "status", header: "Stato", width: "110px", cell: (c) => <span className={`status-pill ${STATUS_CLS[c.status] ?? "st-muted"}`}><span className="sd">●</span>{STATUS_LABEL[c.status] ?? c.status}</span> },
  ], []);

  return (
    <>
      <AdminTopBar title="Coupon e campagne" searchValue={search} onSearchChange={setSearch} searchPlaceholder="Cerca campagna...">
        <button className="btn btn-primary btn-sm" onClick={() => setEditorOpen(true)}>+ Nuova campagna</button>
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
          rows={campaigns}
          rowKey={(c) => c.id}
          emptyText="Nessuna campagna trovata"
          loading={loading}
          page={1}
          pageSize={campaigns.length || 1}
          total={campaigns.length}
          onPageChange={() => {}}
        />

      </div>

      {editorOpen && (
        <CouponEditorModal
          onClose={() => setEditorOpen(false)}
          onReview={(data: any) => { setReviewData(data); setEditorOpen(false); }}
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
