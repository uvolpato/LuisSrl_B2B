"use client";

import type { ReactNode } from "react";

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

  return (
    <header className="admin-top">
      <h1>{title}</h1>
      <div className="top-actions">
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
