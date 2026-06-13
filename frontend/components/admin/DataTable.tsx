"use client";

import type { ReactNode } from "react";

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
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const colCount = columns.length + (actions.length ? 1 : 0);

  return (
    <div className="data-table">
      <div className="data-table-scroll">
        <table>
          <colgroup>
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
              {columns.map((c) => (
                <th key={c.key} style={{ textAlign: c.align ?? "left" }}>
                  {c.header}
                </th>
              ))}
              {actions.length > 0 && (
                <th style={{ textAlign: "right" }}>Azioni</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={colCount} className="data-table-empty">
                  Caricamento…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={colCount} className="data-table-empty">
                  {emptyText}
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr key={rowKey(row)}>
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
                    <td className="data-table-actions">
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
              ))}
          </tbody>
        </table>
      </div>

      <div className="data-table-footer">
        <span className="data-table-range">
          {from}–{to} di {total}
        </span>
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
      </div>
    </div>
  );
}
