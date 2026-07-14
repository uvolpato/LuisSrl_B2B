"use client";

import { useState, type ReactNode } from "react";

export default function AdminTopBar({
  title,
  searchValue,
  onSearchChange,
  filter,
  onFilterChange,
  filterOptions,
  children,
}: {
  title: string;
  searchValue: string;
  onSearchChange: (q: string) => void;
  filter: string;
  onFilterChange: (f: string) => void;
  filterOptions?: { value: string; label: string }[];
  children?: ReactNode;
}) {
  const pills = filterOptions ?? [
    { value: "tutti", label: "Tutti" },
    { value: "attivi", label: "Attivi" },
    { value: "nascosti", label: "Nascosti" },
    { value: "da-configurare", label: "Da Configurare" },
  ];

  // Su mobile la barra (ricerca/filtro/azioni) e' a scomparsa: il toggle e'
  // nascosto da desktop, dove la barra e' sempre visibile.
  const [open, setOpen] = useState(false);

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
        <div className="admin-search">
          <span className="search-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Cerca articolo, colore, famiglia…"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <select
          className="input filter-select"
          style={{ width: "auto", minWidth: 170 }}
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          aria-label="Filtra per stato"
        >
          {pills.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        {children}
      </div>
    </header>
  );
}
