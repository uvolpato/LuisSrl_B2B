"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../../lib/api";
import Modal from "../common/Modal";
import Notice from "../common/Notice";
import type { ProdottoView, SearchResult } from "./types";
import { IconSearch, IconInfo, IconChevronLeft, IconChevronRight } from "./icons";

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
  const selectAllRef = useRef<HTMLInputElement>(null);
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
      const res = await api.get<SearchResult>(`/api/integrazione/prodotti?${params}`);
      setResult(res);
      pageRef.current = p;
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "Errore di ricerca");
    } finally {
      setLoading(false);
    }
  }, [debounced]);

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

  useEffect(() => {
    if (!selectAllRef.current) return;
    const n = sortedItems.length;
    selectAllRef.current.indeterminate = selected.size > 0 && selected.size < n;
  }, [selected, result]);

  function toggle(codice: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(codice)) n.delete(codice); else n.add(codice); return n; });
  }

  async function doImport() {
    if (!selected.size) return;
    setImporting(true);
    setImportResult(null);
    setError(null);
    try {
      const res = await api.post<{ creati: number; articoli: { articoloId: number; codiceLinea: string; varianti: number }[] }>(
        "/api/integrazione/importa",
        { codici: [...selected] },
      );
      setImportResult(`Importati ${res.creati} articoli (${res.articoli.reduce((s, a) => s + a.varianti, 0)} varianti)`);
      setSelected(new Set());
      fetchData(pageRef.current);
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "Errore importazione");
    } finally {
      setImporting(false);
    }
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 0;
  const from = result?.total ? (result.page - 1) * result.limit + 1 : 0;
  const to = result ? Math.min(result.page * result.limit, result.total) : 0;

  const sortedItems = result?.items ? [...result.items].sort((a, b) => {
    if (!sortKey) return 0;
    const getVal = (p: ProdottoView): string | number => {
      if (sortKey === "codice") return p.codice;
      if (sortKey === "descrizione") return p.descrizione;
      if (sortKey === "famiglia") return p.famigliaNome ?? "";
      if (sortKey === "linea") return p.lineaNome ?? "";
      return "";
    };
    const va = getVal(a), vb = getVal(b);
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === "desc" ? -cmp : cmp;
  }) : [];

  function toggleSort(key: string) {
    if (sortKey === key) { setSortDir(d => d === "asc" ? "desc" : "asc"); }
    else { setSortKey(key); setSortDir("asc"); }
  }

  function sortArrow(key: string) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

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
            autoFocus
          />
        </div>

        {error && <Notice variant="error" onClose={() => setError(null)} style={{ marginBottom: 12 }}>{error}</Notice>}
        {importResult && <Notice variant="success" onClose={() => setImportResult(null)} style={{ marginBottom: 12 }}>{importResult}</Notice>}

          <div className="data-table" style={{ flex: 1, minHeight: 0 }}>
            {loading && (
              <div className="data-table-loading-overlay">
                <span>Caricamento…</span>
              </div>
            )}
            <div className="data-table-scroll">
            <table>
              <colgroup>
                <col style={{ width: 48 }} />
                <col style={{ width: 120 }} />
                <col />
                <col style={{ width: 130 }} />
                <col style={{ width: 130 }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ textAlign: "center" }}>
                    <input type="checkbox" ref={selectAllRef} checked={selected.size > 0} onChange={() => { if (selected.size === 0) { setSelected(new Set(sortedItems.map(p => p.codice))); } else { setSelected(new Set()); } }} className="select-all-cb" />
                  </th>
                  <th className="sortable" onClick={() => toggleSort("codice")}>Codice{sortArrow("codice")}</th>
                  <th className="sortable" onClick={() => toggleSort("descrizione")}>Descrizione{sortArrow("descrizione")}</th>
                  <th className="sortable" style={{ textAlign: "center" }} onClick={() => toggleSort("famiglia")}>Famiglia{sortArrow("famiglia")}</th>
                  <th className="sortable" style={{ textAlign: "center" }} onClick={() => toggleSort("linea")}>Linea{sortArrow("linea")}</th>
                </tr>
              </thead>
              <tbody>
                {!loading && !sortedItems.length && (
                  <tr><td colSpan={5} className="data-table-empty">Nessun risultato</td></tr>
                )}
                {sortedItems.map((p) => (
                  <tr key={p.codice}>
                    <td style={{ textAlign: "center" }}>
                      <input type="checkbox" checked={selected.has(p.codice)} onChange={() => toggle(p.codice)} />
                    </td>
                    <td className="mono">{p.codice}</td>
                    <td>{p.descrizione}</td>
                    <td style={{ textAlign: "center" }}>{p.famigliaNome ?? "—"}</td>
                    <td style={{ textAlign: "center" }}>{p.lineaNome ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="data-table-footer">
            <span>{from}–{to} di {result?.total ?? 0}</span>
            {totalPages > 1 && (
              <div className="pager">
                <button type="button" disabled={result!.page <= 1} onClick={() => fetchData(result!.page - 1)} aria-label="Pagina precedente">
                  {IconChevronLeft}
                </button>
                <span className="pager-current">{result!.page} / {totalPages}</span>
                <button type="button" disabled={result!.page * result!.limit >= result!.total} onClick={() => fetchData(result!.page + 1)} aria-label="Pagina successiva">
                  {IconChevronRight}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
