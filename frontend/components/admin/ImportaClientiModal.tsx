"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../../lib/api";
import Modal from "../common/Modal";
import Notice from "../common/Notice";
import type { ClienteView, ClienteSearchResult } from "./types";
import { IconSearch, IconInfo } from "./icons";
import DataTable, { type Column } from "./DataTable";

export default function ImportaClientiModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [result, setResult] = useState<ClienteSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pageRef = useRef(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const fetchData = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debounced) params.set("search", debounced);
      params.set("page", String(p));
      params.set("limit", "50");
      if (sortKey) {
        params.set("sort", sortKey);
        params.set("dir", sortDir);
      }
      const res = await api.get<ClienteSearchResult>(`/api/integrazione/clienti?${params}`);
      setResult(res);
      pageRef.current = p;
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "Errore di ricerca");
    } finally {
      setLoading(false);
    }
  }, [debounced, sortKey, sortDir]);

  useEffect(() => {
    if (open) {
      fetchData(1);
    } else {
      setSearch("");
      setDebounced("");
      setResult(null);
      setImportResult(null);
      setSelected(new Set());
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) fetchData(1);
  }, [debounced, open, fetchData]);

  useEffect(() => {
    if (!importResult) return;
    const t = setTimeout(() => setImportResult(null), 5000);
    return () => clearTimeout(t);
  }, [importResult]);

  async function doImport() {
    if (!selected.size) return;
    setImporting(true);
    setImportResult(null);
    setError(null);

    let cancelled = false;
    const timeoutRef = { current: undefined as ReturnType<typeof setTimeout> | undefined };

    function startTimeout() {
      return setTimeout(() => {
        const ok = window.confirm("L'importazione è in corso da oltre 5 minuti. Vuoi continuare ad attendere?");
        if (!ok) {
          cancelled = true;
          setError("Timeout: importazione interrotta dopo 5 minuti");
          setImporting(false);
        } else {
          timeoutRef.current = startTimeout();
        }
      }, 5 * 60 * 1000);
    }

    timeoutRef.current = startTimeout();

    try {
      const res = await api.post<{ creati: number; aggiornati: number; clienti: { id: number; codiceCliente: string }[] }>(
        "/api/integrazione/clienti/importa",
        { codici: [...selected] },
      );
      clearTimeout(timeoutRef.current);
      if (!cancelled) {
        const parti: string[] = [];
        if (res.creati > 0) parti.push(`${res.creati} creati`);
        if (res.aggiornati > 0) parti.push(`${res.aggiornati} aggiornati`);
        setImportResult(parti.length ? `Importazione completata: ${parti.join(', ')}` : 'Nessuna modifica');
        setSelected(new Set());
        fetchData(pageRef.current);
        onImported?.();
      }
    } catch (err) {
      clearTimeout(timeoutRef.current);
      if (!cancelled) {
        setError(err instanceof ApiError ? err.code : "Errore importazione");
      }
    } finally {
      if (!cancelled) setImporting(false);
    }
  }

  const sortedItems = result?.items ?? [];

  const columns: Column<ClienteView>[] = [
    { key: "codice", header: "Codice", width: "120px", mono: true, sortable: true, cell: (p) => p.codiceCliente ?? "—" },
    { key: "ragioneSociale", header: "Ragione sociale", grow: true, sortable: true, cell: (p) => p.ragioneSociale },
    { key: "citta", header: "Città", width: "120px", sortable: true, cell: (p) => p.citta ?? "—" },
    { key: "listino", header: "Listino", width: "90px", align: "center", sortable: true, cell: (p) => p.codiceListino ?? "—" },
    { key: "ordini", header: "Ordini", width: "90px", align: "center", sortable: true, cell: (p) => (
        <>{p.numOrdini ?? 0}{p.numOrdiniAnno ? <span style={{ color: "var(--muted)", fontSize: 12 }}> ({p.numOrdiniAnno})</span> : null}</>
    )},
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Importa Clienti"
      footer={
        <>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {selected.size > 0 ? `${selected.size} selezionati` : ""}
          </span>
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary btn-sm" disabled={selected.size === 0 || importing} onClick={doImport}>
            {importing ? "Importazione..." : "Importa selezionati"}
          </button>
        </>
      }
    >
      <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="new-art-hint">
          {IconInfo}
          Cerca i clienti da importare da Integra. L'import crea l'anagrafica, gli indirizzi di spedizione e le condizioni di pagamento. La password viene generata automaticamente e il cliente resta bloccato finché non viene attivato.
        </div>
        <div className="new-art-search">
          <span className="search-icon">{IconSearch}</span>
          <input
            placeholder="Cerca cliente, codice, P.IVA, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={importing}
            autoFocus
          />
        </div>

        {error && <Notice variant="error" onClose={() => setError(null)} style={{ marginBottom: 12 }}>{error}</Notice>}
        {importResult && <Notice variant="success" onClose={() => setImportResult(null)} style={{ marginBottom: 12 }}>{importResult}</Notice>}

        <DataTable
          columns={columns}
          rows={sortedItems}
          rowKey={(p) => p.codiceCliente ?? ""}
          emptyText="Nessun risultato"
          loading={loading}
          disabled={importing}
          selectable
          selectedKeys={selected as Set<string | number>}
          onSelectionChange={(k) => setSelected(k as Set<string>)}
          page={result?.page ?? 1}
          pageSize={result?.limit ?? 50}
          total={result?.total ?? 0}
          onPageChange={(pg) => fetchData(pg)}
          sortKey={sortKey ?? undefined}
          sortDir={sortDir}
          onSort={(key, dir) => { setSortKey(key); setSortDir(dir); }}
        />
      </div>
    </Modal>
  );
}
