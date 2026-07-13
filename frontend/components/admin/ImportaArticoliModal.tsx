"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../../lib/api";
import Modal from "../common/Modal";
import Notice from "../common/Notice";
import type { ProdottoView, SearchResult } from "./types";
import { IconSearch, IconInfo } from "./icons";
import DataTable, { type Column } from "./DataTable";

export default function ImportaArticoliModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pageRef = useRef(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Debounce search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // Fetch
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
      const res = await api.get<SearchResult>(`/api/integrazione/prodotti?${params}`);
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

  // Fetch quando cambia la ricerca
  useEffect(() => {
    if (open) fetchData(1);
  }, [debounced, open, fetchData]);

  // Auto-dismiss notice import dopo 5 secondi
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
      const res = await api.post<{ creati: number; articoli: { articoloId: number; codiceLinea: string; varianti: number }[] }>(
        "/api/integrazione/importa",
        { codici: [...selected] },
      );
      clearTimeout(timeoutRef.current);
      if (!cancelled) {
        setImportResult(`Importati ${res.creati} articoli (${res.articoli.reduce((s, a) => s + a.varianti, 0)} varianti)`);
        setSelected(new Set());
        fetchData(pageRef.current);
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

  const columns: Column<ProdottoView>[] = [
    { key: "codice", header: "Codice", width: "120px", mono: true, sortable: true, cell: (p) => p.codice },
    { key: "descrizione", header: "Descrizione", grow: true, sortable: true, cell: (p) => p.descrizione },
    { key: "famiglia", header: "Famiglia", width: "130px", align: "center", sortable: true, sortValue: (p) => p.famigliaNome ?? "", cell: (p) => p.famigliaNome ?? "—" },
    { key: "linea", header: "Linea", width: "130px", align: "center", sortable: true, sortValue: (p) => p.lineaNome ?? "", cell: (p) => p.lineaNome ?? "—" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Nuovo Articolo"
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
          Cerca gli articoli da importare da Integra. Le varianti selezionate verranno importate creando Famiglia → Articolo → Varianti.
        </div>
        <div className="new-art-search">
          <span className="search-icon">{IconSearch}</span>
          <input
            placeholder="Cerca articolo, codice, famiglia..."
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
          rowKey={(p) => p.codice}
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
