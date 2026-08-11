"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../lib/use-auth";
import { api, ApiError } from "../../../lib/api";
import LoadingScreen from "../../../components/common/LoadingScreen";
import ClearButton from "../../../components/common/ClearButton";
import OrdineDetailModal from "../../../components/users/OrdineDetailModal";
import DataTable, { type Column, type RowAction } from "../../../components/admin/DataTable";
import { IconEye } from "../../../components/admin/icons";
import type { OrdineCliente, OrdiniResponse } from "../../../lib/types";
import { DateRangePicker, createStaticRanges } from "react-date-range";
import { it } from "date-fns/locale";
import { addDays, endOfDay, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns";

const staticRangesIT = createStaticRanges([
  { label: "Oggi", range: () => ({ startDate: new Date(), endDate: new Date() }) },
  { label: "Ieri", range: () => ({ startDate: subDays(new Date(), 1), endDate: subDays(new Date(), 1) }) },
  { label: "Questa settimana", range: () => ({ startDate: startOfWeek(new Date(), { weekStartsOn: 1 }), endDate: new Date() }) },
  { label: "Questo mese", range: () => ({ startDate: startOfMonth(new Date()), endDate: new Date() }) },
  { label: "Ultimi 7 giorni", range: () => ({ startDate: subDays(new Date(), 6), endDate: new Date() }) },
  { label: "Ultimi 30 giorni", range: () => ({ startDate: subDays(new Date(), 29), endDate: new Date() }) },
]);
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function fmtPrezzo(n: string | null | number): string {
  const v = typeof n === "number" ? n : (n ? Number(n) : 0);
  return v ? `€ ${v.toFixed(2)}` : "—";
}

function calcTotale(ord: OrdineCliente): number {
  return ord.righe.reduce((s, r) => s + (Number(r.quantita) || 0) * (Number(r.prezzo) || 0), 0);
}

type SortField = "numeroOrdine" | "dataOrdine" | "stato" | "importoTotale";

export default function OrdiniPage() {
  const { user, loading: authLoading } = useAuth("customer");

  const [ordini, setOrdini] = useState<OrdineCliente[]>([]);
  const [total, setTotal] = useState(0);
  const [years, setYears] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  // Ricerca arrivata dalla dashboard (ambito "Ordini"): ?q=
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setSearch(q);
  }, []);
  const [year, setYear] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [dataDa, setDataDa] = useState(today);
  const [dataA, setDataA] = useState(today);
  const [sortBy, setSortBy] = useState<SortField>("dataOrdine");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [detailOrdine, setDetailOrdine] = useState<OrdineCliente | null>(null);

  // Range picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const dateRange = {
    startDate: new Date(dataDa + "T00:00:00"),
    endDate: new Date(dataA + "T23:59:59"),
    key: "selection",
  };

  const fetchOrdini = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortDir,
      });
      if (search) params.set("search", search);
      params.set("dataDa", dataDa);
      params.set("dataA", dataA);
      const r = await api.get<OrdiniResponse>(`/api/ordini?${params}`);
      setOrdini(r.items);
      setTotal(r.total);
      setYears(r.years);
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "errors.generic");
    }
    setLoading(false);
  }, [page, limit, search, dataDa, dataA, sortBy, sortDir]);

  useEffect(() => {
    if (!authLoading && user) fetchOrdini();
  }, [authLoading, user, fetchOrdini]);

  const refetch = () => {
    setSearch("");
    setDataDa(today);
    setDataA(today);
    setPage(1);
    setSortBy("dataOrdine");
    setSortDir("desc");
    setTimeout(fetchOrdini, 50);
  };

  const onSort = useCallback((key: string, dir: "asc" | "desc") => {
    setSortBy(key as SortField);
    setSortDir(dir);
    setPage(1);
  }, []);

  const columns: Column<OrdineCliente>[] = [
    { key: "numeroOrdine", header: "Ordine", grow: true, mono: true, sortable: true,
      cell: (o) => <span className="bold">#{o.numeroOrdine}</span> },
    { key: "dataOrdine", header: "Data", width: "130px", mono: true, sortable: true,
      cell: (o) => <span className="small">{fmtDate(o.dataOrdine)}</span> },
    { key: "stato", header: "Stato", width: "130px", sortable: true,
      cell: (o) => o.stato || "—" },
    { key: "importoTotale", header: "Totale", width: "130px", align: "right", mono: true, sortable: true,
      cell: (o) => fmtPrezzo(calcTotale(o)) },
  ];

  const actions: RowAction<OrdineCliente>[] = [
    { icon: () => IconEye, tooltip: () => "Dettaglio ordine", onClick: (o) => setDetailOrdine(o) },
  ];

  const up = user as any;
  const codiceCliente = up?.codiceCliente || up?.customerProfile?.codiceCliente || "";
  const nomeAzienda = up?.ragioneSociale || up?.customerProfile?.ragioneSociale || "";

  async function handleSync() {
    if (!codiceCliente) return;
    setSyncing(true);
    try {
      await api.post(`/api/integrazione/clienti/${encodeURIComponent(codiceCliente)}/sync-ordini`);
    } catch { /* fallback */ }
    await fetchOrdini();
    setSyncing(false);
  }

  if (authLoading || !user || user.userType !== "customer") return <LoadingScreen />;

  return (
    <div className="catalogo-page ordini-page">
      <main id="content">
        <div className="container">
          <div className="page-title">
            <h1>I miei ordini</h1>
            {nomeAzienda && <span className="meta">{nomeAzienda}</span>}
          </div>

          {/* Filtri e ricerca */}
          <div className="ordini-toolbar">
            <div className="ordini-search">
              <div style={{ position: "relative", display: "flex", flex: 1 }}>
                <input
                  className="form-input search-input"
                  style={{ flex: 1, height: 38, boxSizing: "border-box", paddingTop: 6, paddingBottom: 6, paddingRight: search ? 34 : undefined }}
                  placeholder="Cerca per numero ordine, codice prodotto…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
                {search && (
                  <ClearButton onClear={() => { setSearch(""); setPage(1); }} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }} />
                )}
              </div>
              <button className="btn btn-primary btn-sm" style={{ height: 38, boxSizing: "border-box" }} onClick={() => fetchOrdini()} disabled={loading}>
                Cerca
              </button>
            </div>
            <div className="ordini-filters">
              <div style={{ display: "flex", alignItems: "center", gap: 4, height: 38, boxSizing: "border-box", padding: "0 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer" }}
                onClick={() => setPickerOpen(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ color: "var(--muted)", flexShrink: 0 }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg)" }}>
                  {dataDa.split("-").reverse().join("/")} → {dataA.split("-").reverse().join("/")}
                </span>
              </div>
              {pickerOpen && (
                <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "oklch(0% 0 0 / 0.4)" }} onClick={(e) => { if (e.target === e.currentTarget) setPickerOpen(false); }}>
                  <div style={{ background: "var(--surface)", borderRadius: 16, padding: 8, boxShadow: "0 20px 60px oklch(0% 0 0 / 0.3)" }} onClick={(e) => e.stopPropagation()}>
                    <DateRangePicker
                      ranges={[dateRange]}
                      onChange={(r: any) => {
                        setDataDa(r.selection.startDate.toISOString().slice(0, 10));
                        setDataA(r.selection.endDate.toISOString().slice(0, 10));
                        setPage(1);
                      }}
                      locale={it}
                      moveRangeOnFirstSelection={false}
                      rangeColors={["#d97706"]}
                      staticRanges={staticRangesIT}
                      inputRanges={[]}
                    />
                    <div style={{ padding: "0 8px 8px", display: "flex", justifyContent: "flex-end" }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setPickerOpen(false)}>Chiudi</button>
                    </div>
                  </div>
                </div>
              )}
              <button className="btn btn-secondary btn-sm" style={{ height: 38, boxSizing: "border-box" }} onClick={handleSync} disabled={syncing} title="Sincronizza ordini da Integra">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: "middle" }}>
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                {syncing ? "Sincronizzo…" : "Sincronizza"}
              </button>
            </div>
          </div>

          {/* Tabella — componente condiviso con l'admin */}
          {error ? (
            <div className="error-state">
              <p>Impossibile caricare gli ordini.</p>
              <button className="btn btn-secondary btn-sm" onClick={fetchOrdini}>Riprova</button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={ordini}
              rowKey={(o) => o.id}
              actions={actions}
              emptyText={search || year ? "Nessun ordine trovato con questi filtri." : "Nessun ordine trovato."}
              loading={loading}
              page={page}
              pageSize={limit}
              total={total}
              onPageChange={setPage}
              sortKey={sortBy}
              sortDir={sortDir}
              onSort={onSort}
            />
          )}
        </div>
      </main>

      {detailOrdine && (
        <OrdineDetailModal
          ordine={detailOrdine}
          onClose={() => setDetailOrdine(null)}
        />
      )}

    </div>
  );
}
