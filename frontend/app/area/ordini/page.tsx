"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../lib/use-auth";
import { api, ApiError } from "../../../lib/api";
import LoadingScreen from "../../../components/common/LoadingScreen";
import AreaHeader from "../../../components/area/AreaHeader";
import AreaFooter from "../../../components/area/AreaFooter";
import OrdineDetailModal from "../../../components/users/OrdineDetailModal";
import DataTable, { type Column, type RowAction } from "../../../components/admin/DataTable";
import { IconEye } from "../../../components/admin/icons";
import type { OrdineCliente, OrdiniResponse } from "../../../lib/types";

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
  const [year, setYear] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("dataOrdine");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [detailOrdine, setDetailOrdine] = useState<OrdineCliente | null>(null);

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
      if (year) params.set("year", year);
      const r = await api.get<OrdiniResponse>(`/api/ordini?${params}`);
      setOrdini(r.items);
      setTotal(r.total);
      setYears(r.years);
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "errors.generic");
    }
    setLoading(false);
  }, [page, limit, search, year, sortBy, sortDir]);

  useEffect(() => {
    if (!authLoading && user) fetchOrdini();
  }, [authLoading, user, fetchOrdini]);

  const refetch = () => {
    setSearch("");
    setYear("");
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
      <AreaHeader />
      <main id="content">
        <div className="container">
          <div className="page-title">
            <h1>I miei ordini</h1>
            {nomeAzienda && <span className="meta">{nomeAzienda}</span>}
          </div>

          {/* Filtri e ricerca */}
          <div className="ordini-toolbar">
            <div className="ordini-search">
              <input
                className="form-input search-input"
                placeholder="Cerca per numero ordine, codice prodotto…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              <button className="btn btn-primary btn-sm" onClick={() => fetchOrdini()} disabled={loading}>
                Cerca
              </button>
            </div>
            <div className="ordini-filters">
              {years.length > 0 && (
                <select className="form-select" value={year} onChange={(e) => { setYear(e.target.value); setPage(1); }}>
                  <option value="">Tutti gli anni</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              )}
              <button className="btn btn-secondary btn-sm" onClick={handleSync} disabled={syncing} title="Sincronizza ordini da Integra">
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

      <AreaFooter />
    </div>
  );
}
