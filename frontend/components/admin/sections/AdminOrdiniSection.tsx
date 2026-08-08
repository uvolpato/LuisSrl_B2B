"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import AdminTopBar from "../AdminTopBar";
import DataTable from "../DataTable";
import type { Column, RowAction } from "../DataTable";
import { api, ApiError } from "../../../lib/api";
import Notice from "../../common/Notice";
import OrdineDetailModal from "./OrdineDetailModal";

interface OrderSummary {
  id: number;
  num: string;
  clienteId: number;
  clienteNome: string;
  data: string;
  ora: string;
  stato: string;
  pagamento: string;
  totale: number;
  pezzi: number;
}

interface DashboardData {
  count: number;
  totale: number;
  scontoMedio: number;
  spedizioneMedia: number | null;
  pezzi: number;
  clienti: number;
  inAttesa: number;
}

interface PageData {
  items: OrderSummary[];
  total: number;
  page: number;
  pages: number;
}

const STATI: Record<string, string> = {
  confermato: "Confermato",
  inoltrato: "Inoltrato a fornitore",
  evaso: "Evaso",
  annullato: "Annullato",
  attesa: "In attesa",
};

const STATO_CLS: Record<string, string> = {
  confermato: "st-ok",
  inoltrato: "st-blue",
  evaso: "st-ok",
  annullato: "st-red",
  attesa: "st-amber",
};

function fmtEur(n: number): string {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function fmtDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function AdminOrdiniSection() {
  const today = toISODate(new Date());
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [orders, setOrders] = useState<PageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [search]);

  const fetchAll = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({ data: date });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const [d, o] = await Promise.all([
        api.get<DashboardData>(`/api/admin/ordini/dashboard?${params}`),
        api.get<PageData>(`/api/admin/ordini?${params}&page=${page}&limit=10`),
      ]);
      setDash(d);
      setOrders(o);
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "errors.generic");
    }
    setLoading(false);
  }, [date, debouncedSearch, page]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(1); }, [date, debouncedSearch]);

  function changeDay(delta: number) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setDate(toISODate(d));
  }

  const columns: Column<OrderSummary>[] = useMemo(() => [
    { key: "num", header: "N. Ordine", width: "120px", mono: true, cell: (r) => <span style={{ fontWeight: 600, color: "var(--accent)" }}>{r.num}</span> },
    { key: "cliente", header: "Cliente", grow: true, cell: (r) => <div className="cell-entity"><div className="cell-entity-text"><div className="cell-entity-title">{r.clienteNome}</div></div></div> },
    { key: "data", header: "Data", width: "130px", mono: true, cell: (r) => `${fmtDate(r.data)} ${r.ora}` },
    { key: "pezzi", header: "Pezzi", width: "90px", align: "right", mono: true, cell: (r) => String(r.pezzi) },
    { key: "totale", header: "Totale", width: "110px", align: "right", mono: true, cell: (r) => r.totale === 0 ? "—" : fmtEur(r.totale) },
    { key: "stato", header: "Stato", width: "110px", cell: (r) => <span className={`status-pill ${STATO_CLS[r.stato] ?? "st-amber"}`}><span className="sd">●</span>{STATI[r.stato] ?? r.stato}</span> },
    { key: "pagamento", header: "Pagamento", width: "100px", mono: true, cell: (r) => <span style={{ fontSize: 12 }}>{r.pagamento}</span> },
  ], []);

  const actions: RowAction<OrderSummary>[] = useMemo(() => [{
    icon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    tooltip: () => "Dettaglio",
    onClick: (r) => setDetailId(r.id),
  }], []);

  return (
    <>
      <AdminTopBar
        title="Ordini"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cerca per cliente o numero ordine..."
      >
        <div className="date-nav">
          <button type="button" onClick={() => changeDay(-1)} title="Giorno precedente" style={{ width: 64, height: 36, display: "grid", placeItems: "center", border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", color: "var(--fg)", cursor: "pointer", padding: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <input type="date" className="date-input" value={date} onChange={(e) => setDate(e.target.value)} style={{ paddingBlock: 9 }} />
          <button type="button" className="btn btn-secondary btn-sm" style={{ minWidth: 72, fontSize: 13, paddingBlock: 9, justifyContent: "center" }} onClick={() => setDate(today)}>Oggi</button>
          <button type="button" onClick={() => changeDay(1)} title="Giorno successivo" style={{ width: 64, height: 36, display: "grid", placeItems: "center", border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", color: "var(--fg)", cursor: "pointer", padding: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </AdminTopBar>

      <div className="admin-content">
        {error && <Notice variant="error" onClose={() => setError(null)}>{error}</Notice>}

        {dash && (
          <div className="dash-grid">
            <div className="dash-card">
              <div className="label">Ordini del giorno</div>
              <div className="value">{dash.count}</div>
              {dash.inAttesa > 0 && <div className="sub">{dash.inAttesa} in attesa di conferma</div>}
            </div>
            <div className="dash-card">
              <div className="label">Totale venduto</div>
              <div className="value">{fmtEur(dash.totale)}</div>
              <div className="sub">IVA esclusa</div>
            </div>
            <div className="dash-card">
              <div className="label">Sconto medio</div>
              <div className="value green">{dash.scontoMedio.toFixed(1).replace(".", ",")}%</div>
              <div className="sub">su prezzo di listino</div>
            </div>
            <div className="dash-card">
              <div className="label">Spedizione media</div>
              <div className="value">{dash.spedizioneMedia != null ? fmtEur(dash.spedizioneMedia) : "—"}</div>
              <div className="sub">per ordine con spedizione</div>
            </div>
          </div>
        )}

        {dash && orders && (
          <div className="totals-bar">
            <span>Ordini: <strong>{dash.count}</strong></span>
            <span>Pezzi: <strong>{dash.pezzi}</strong></span>
            <span>Clienti: <strong>{dash.clienti}</strong></span>
            <span style={{ marginLeft: "auto" }}>Totale: <strong className="totals-bar-accent">{fmtEur(dash.totale)}</strong></span>
          </div>
        )}

        {orders && (
          <DataTable
            columns={columns}
            rows={orders.items}
            rowKey={(r) => r.id}
            actions={actions}
            emptyText="Nessun ordine trovato per questa data."
            loading={loading}
            page={orders.page}
            pageSize={10}
            total={orders.total}
            onPageChange={setPage}
          />
        )}
      </div>

      {detailId !== null && (
        <OrdineDetailModal orderId={detailId} onClose={() => setDetailId(null)} />
      )}
    </>
  );
}
