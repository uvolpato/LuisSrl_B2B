"use client";

/** Skeleton di caricamento delle tabelle: righe finte con barre pulsanti,
 *  uguali in tutta l'app. Da usare dentro un contenitore `.data-table`. */
export default function DataTableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="data-table-skeleton" role="status" aria-label="Caricamento in corso">
      {Array.from({ length: rows }, (_, r) => (
        <div className="skeleton-row" key={r}>
          {Array.from({ length: cols }, (_, c) => (
            <span
              key={c}
              aria-hidden="true"
              className={`sk ${c === cols - 1 ? "sk-action" : ""}`}
              style={{ flex: c === cols - 1 ? "0 0 68px" : c === 0 ? "3 1 0" : "1 1 0" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
