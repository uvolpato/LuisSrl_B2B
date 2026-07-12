"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../../lib/api";
import Modal from "../common/Modal";
import Notice from "../common/Notice";
import type { ClienteView, ClienteSearchResult } from "./types";
import { IconSearch, IconInfo, IconChevronLeft, IconChevronRight } from "./icons";

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
  const selectAllRef = useRef<HTMLInputElement>(null);
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
      const res = await api.post<{ creati: number; clienti: { id: number; codiceCliente: string }[] }>(
        "/api/integrazione/clienti/importa",
        { codici: [...selected] },
      );
      clearTimeout(timeoutRef.current);
      if (!cancelled) {
        setImportResult(`Importati ${res.creati} clienti`);
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

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 0;
  const from = result?.total ? (result.page - 1) * result.limit + 1 : 0;
  const to = result ? Math.min(result.page * result.limit, result.total) : 0;

  const sortedItems = result?.items ?? [];

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
                <col style={{ width: 120 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 80 }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ textAlign: "center" }}>
                    <input type="checkbox" ref={selectAllRef} checked={selected.size > 0} disabled={importing} onChange={() => { if (selected.size === 0) { setSelected(new Set(sortedItems.map(p => p.codiceCliente ?? ""))); } else { setSelected(new Set()); } }} className="select-all-cb" />
                  </th>
                  <th className="sortable" onClick={() => toggleSort("codice")}>Codice{sortArrow("codice")}</th>
                  <th className="sortable" onClick={() => toggleSort("ragioneSociale")}>Ragione sociale{sortArrow("ragioneSociale")}</th>
                  <th className="sortable" onClick={() => toggleSort("citta")}>Città{sortArrow("citta")}</th>
                  <th className="sortable" style={{ textAlign: "center" }} onClick={() => toggleSort("listino")}>Listino{sortArrow("listino")}</th>
                  <th className="sortable" style={{ textAlign: "center" }} onClick={() => toggleSort("ordini")}>Ordini{sortArrow("ordini")}</th>
                </tr>
              </thead>
              <tbody>
                {!loading && !sortedItems.length && (
                  <tr><td colSpan={6} className="data-table-empty">Nessun risultato</td></tr>
                )}
                {sortedItems.map((p) => {
                  const key = p.codiceCliente ?? "";
                  return (
                    <tr key={key}>
                      <td style={{ textAlign: "center" }}>
                        <input type="checkbox" checked={selected.has(key)} disabled={importing} onChange={() => toggle(key)} />
                      </td>
                      <td className="mono">{p.codiceCliente ?? "—"}</td>
                      <td>{p.ragioneSociale}</td>
                      <td>{p.citta ?? "—"}</td>
                      <td style={{ textAlign: "center" }}>{p.codiceListino ?? "—"}</td>
                      <td style={{ textAlign: "center" }}>
                        {p.numOrdini ?? 0}
                        {p.numOrdiniAnno ? <span style={{ color: "var(--muted)", fontSize: 12 }}> ({p.numOrdiniAnno})</span> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="data-table-footer">
            <span>{from}–{to} di {result?.total ?? 0}</span>
            {totalPages > 1 && (
              <div className="pager">
                <button type="button" disabled={result!.page <= 1 || importing} onClick={() => fetchData(result!.page - 1)} aria-label="Pagina precedente">
                  {IconChevronLeft}
                </button>
                <span className="pager-current">{result!.page} / {totalPages}</span>
                <button type="button" disabled={result!.page * result!.limit >= result!.total || importing} onClick={() => fetchData(result!.page + 1)} aria-label="Pagina successiva">
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
