"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/** Definizione di una colonna: header e cella usano la stessa colonna,
 *  quindi l'incolonnamento header↔valori e' garantito. */
export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Allineamento di header e celle. Default: left. */
  align?: "left" | "center" | "right";
  /** Larghezza fissa (es. "120px"). Se assente la colonna si adatta. */
  width?: string;
  /** La colonna prende lo spazio rimanente (tipicamente la principale). */
  grow?: boolean;
  /** Numeri tabellari (monospace, tabular-nums). */
  mono?: boolean;
  cell: (row: T) => ReactNode;
  /** Abilita ordinamento su questa colonna. */
  sortable?: boolean;
  /** Valore usato per l'ordinamento (se omesso usa la cella renderizzata come stringa). */
  sortValue?: (row: T) => string | number;
}

/** Azione di riga: icona + tooltip che spiega cosa fa. */
export interface RowAction<T> {
  /** SVG dell'icona (lo passa la sezione: ogni tabella sceglie le sue). */
  icon: (row: T) => ReactNode;
  /** Testo del tooltip (puo' dipendere dalla riga: es. Blocca/Sblocca). */
  tooltip: (row: T) => string;
  onClick: (row: T) => void;
  variant?: "default" | "danger";
  hidden?: (row: T) => boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  actions?: RowAction<T>[];
  emptyText: string;
  loading?: boolean;
  /** Paginazione (1-based). Il genitore tiene lo stato: server-side per i dati
   *  reali, client-side per le sezioni mock. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Ordinamento (controllato dal genitore per server-side). */
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string, dir: "asc" | "desc") => void;
  /** Selezione righe (checkbox). */
  selectable?: boolean;
  selectedKeys?: Set<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  actions = [],
  emptyText,
  loading = false,
  page,
  pageSize,
  total,
  onPageChange,
  sortKey: propSortKey,
  sortDir: propSortDir,
  onSort,
  selectable = false,
  selectedKeys,
  onSelectionChange,
}: DataTableProps<T>) {
  const [localSortKey, setLocalSortKey] = useState<string | null>(null);
  const [localSortDir, setLocalSortDir] = useState<"asc" | "desc">("asc");

  const isControlled = onSort !== undefined;
  const activeSortKey = isControlled ? propSortKey ?? null : localSortKey;
  const activeSortDir = isControlled ? propSortDir ?? "asc" : localSortDir;

  const sortedRows = useMemo(() => {
    if (!activeSortKey) return rows;
    const col = columns.find((c) => c.key === activeSortKey);
    if (!col || !col.sortable) return rows;

    return [...rows].sort((a, b) => {
      const va = col.sortValue ? col.sortValue(a) : String(col.cell(a));
      const vb = col.sortValue ? col.sortValue(b) : String(col.cell(b));
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return activeSortDir === "desc" ? -cmp : cmp;
    });
  }, [rows, activeSortKey, activeSortDir, columns]);

  const handleSort = useCallback(
    (key: string) => {
      if (isControlled) {
        const nextDir = propSortKey === key && propSortDir === "asc" ? "desc" : "asc";
        onSort(key, nextDir);
      } else {
        setLocalSortDir((prev) => (localSortKey === key && prev === "asc" ? "desc" : "asc"));
        setLocalSortKey(key);
      }
    },
    [isControlled, localSortKey, propSortKey, propSortDir, onSort],
  );

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange || !selectedKeys) return;
    if (sortedRows.length === selectedKeys.size && sortedRows.every((r) => selectedKeys.has(rowKey(r)))) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(sortedRows.map((r) => rowKey(r))));
    }
  }, [sortedRows, selectedKeys, onSelectionChange, rowKey]);

  function toggleRow(key: string | number) {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const colCount = columns.length + (actions.length ? 1 : 0) + (selectable ? 1 : 0);

  const allSelected = sortedRows.length > 0 && sortedRows.every((r) => selectedKeys?.has(rowKey(r)));
  const someSelected = sortedRows.length > 0 && (selectedKeys?.size ?? 0) > 0 && !allSelected;
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  return (
    <div className="data-table">
      {loading && (
        <div className="data-table-loading-overlay">
          <span>Caricamento…</span>
        </div>
      )}
      <div className="data-table-scroll">
        <table>
          <colgroup>
            {selectable && <col style={{ width: "44px" }} />}
            {columns.map((c) => (
              <col
                key={c.key}
                style={c.grow ? undefined : c.width ? { width: c.width } : undefined}
              />
            ))}
            {actions.length > 0 && <col style={{ width: `${actions.length * 40 + 16}px` }} />}
          </colgroup>
          <thead>
            <tr>
              {selectable && (
                <th>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    style={{ accentColor: "var(--accent)" }}
                  />
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={c.sortable ? "sortable" : undefined}
                  style={{ textAlign: c.align ?? "left" }}
                  onClick={c.sortable ? () => handleSort(c.key) : undefined}
                >
                  {c.header}
                  {c.sortable && activeSortKey === c.key && (
                    <span className="sort-arrow">{activeSortDir === "asc" ? " ▲" : " ▼"}</span>
                  )}
                </th>
              ))}
              {actions.length > 0 && (
                <th style={{ textAlign: "right" }}>Azioni</th>
              )}
            </tr>
          </thead>
          <tbody>
            {!loading && sortedRows.length === 0 && (
              <tr>
                <td colSpan={colCount} className="data-table-empty">
                  {emptyText}
                </td>
              </tr>
            )}
            {!loading &&
              sortedRows.map((row) => {
                const key = rowKey(row);
                return (
                  <tr
                    key={key}
                    className={selectable && selectedKeys?.has(key) ? "selected" : undefined}
                    onClick={selectable ? () => toggleRow(key) : undefined}
                    style={selectable ? { cursor: "pointer" } : undefined}
                  >
                    {selectable && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedKeys?.has(key) ?? false}
                          onChange={() => toggleRow(key)}
                          style={{ accentColor: "var(--accent)" }}
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        style={{ textAlign: c.align ?? "left" }}
                        className={c.mono ? "mono" : undefined}
                      >
                        {c.cell(row)}
                      </td>
                    ))}
                    {actions.length > 0 && (
                      <td className="data-table-actions" onClick={(e) => e.stopPropagation()}>
                        {actions
                          .filter((a) => !a.hidden?.(row))
                          .map((a, i) => (
                            <button
                              key={i}
                              type="button"
                              className={`row-action${a.variant === "danger" ? " danger" : ""}`}
                              data-tip={a.tooltip(row)}
                              aria-label={a.tooltip(row)}
                              onClick={() => a.onClick(row)}
                            >
                              {a.icon(row)}
                            </button>
                          ))}
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="data-table-footer">
        <span className="data-table-range">
          {from}–{to} di {total}
        </span>
        {totalPages > 1 && (
          <div className="pager">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Pagina precedente"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="pager-current">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label="Pagina successiva"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
