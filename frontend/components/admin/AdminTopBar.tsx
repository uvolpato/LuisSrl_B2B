"use client";

import { useTranslations } from "next-intl";

export default function AdminTopBar({
  title,
  searchValue,
  onSearchChange,
  filter,
  onFilterChange,
}: {
  title: string;
  searchValue: string;
  onSearchChange: (q: string) => void;
  filter: string;
  onFilterChange: (f: string) => void;
}) {
  const tc = useTranslations("common");

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
            placeholder={tc("search")}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="filter-pills">
          {["tutti", "attivi", "nascosti", "da-configurare"].map((f) => (
            <button
              key={f}
              className={`filter-pill ${filter === f ? "active" : ""}`}
              onClick={() => onFilterChange(f)}
            >
              {f === "tutti" ? "Tutti" : f === "attivi" ? "Attivi" : f === "nascosti" ? "Nascosti" : "Da Configurare"}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
