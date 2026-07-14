"use client";

import { useState, type ReactNode } from "react";

/**
 * Barra in alto delle sezioni admin: titolo + (opzionali) ricerca, filtro e azioni.
 *
 * Su mobile (<=640px) e' **a scomparsa**: si vede solo il titolo con una freccia
 * ▼/▲; il resto si apre al tocco. Su desktop il toggle non esiste e la barra e'
 * sempre visibile (vedi .admin-top-toggle / .admin-top-titlebar in admin.css).
 *
 * Tutte le parti sono opzionali: passa solo quelle che servono alla sezione.
 */
export default function AdminTopBar({
  title,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Cerca articolo, colore, famiglia…",
  filter,
  onFilterChange,
  filterOptions,
  leading,
  children,
}: {
  title: string;
  /** Ricerca: se omessa, il campo non viene mostrato. */
  searchValue?: string;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
  /** Filtro a tendina: se omesso, non viene mostrato. */
  filter?: string;
  onFilterChange?: (f: string) => void;
  filterOptions?: { value: string; label: string }[];
  /** Contenuto prima della ricerca (es. la select del listino). */
  leading?: ReactNode;
  /** Azioni a destra (pulsanti). */
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const hasSearch = searchValue !== undefined && onSearchChange !== undefined;
  const hasFilter = filter !== undefined && onFilterChange !== undefined;
  const pills = filterOptions ?? [
    { value: "tutti", label: "Tutti" },
    { value: "attivi", label: "Attivi" },
    { value: "nascosti", label: "Nascosti" },
    { value: "da-configurare", label: "Da Configurare" },
  ];

  return (
    <header className="admin-top">
      <div className="admin-top-titlebar">
        <h1>{title}</h1>
        <button
          type="button"
          className="admin-top-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Nascondi ricerca e filtri" : "Mostra ricerca e filtri"}
        >
          {open ? "▲" : "▼"}
        </button>
      </div>
      <div className={`top-actions${open ? " open" : ""}`}>
        {leading}
        {hasSearch && (
          <div className="admin-search">
            <span className="search-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </span>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}
        {hasFilter && (
          <select
            className="input filter-select"
            style={{ width: "auto", minWidth: 170 }}
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            aria-label="Filtra"
          >
            {pills.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        )}
        {children}
      </div>
    </header>
  );
}
