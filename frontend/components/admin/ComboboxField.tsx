"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";

export interface ComboboxOption {
  value: string;
  label: string;
  meta?: string;
}

/**
 * Combobox con ricerca: input + dropdown filtra le opzioni in tempo reale.
 * Comportamento identico al prototipo spese-spedizione.html (§11.4 / §10):
 *  - opzione "Usa tariffa automatica" (`value: ''`) SEMPRE visibile (anche a
 *    query non vuota) e mai auto-selezionata;
 *  - ArrowUp/Down per evidenziare, Enter per selezionare, Escape per chiudere;
 *  - click fuori / blur chiudono il dropdown.
 */
export default function ComboboxField({
  value,
  onChange,
  options,
  allowAuto = true,
  autoLabel = "Usa tariffa automatica",
  placeholder = "Cerca o seleziona…",
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  allowAuto?: boolean;
  autoLabel?: string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Opzione fissa "automatica" in testa: sempre presente, mai filtrata via.
  const all = useMemo(() => {
    const opts: ComboboxOption[] = allowAuto ? [{ value: "", label: autoLabel }] : [];
    return opts.concat(options);
  }, [allowAuto, autoLabel, options]);

  // Quando il valore cambia dall'esterno (reset, cambio nazione…), aggiorna il
  // testo dell'input con l'etichetta del valore corrente.
  useEffect(() => {
    const opt = all.find((o) => o.value === value);
    setQuery(opt ? opt.label : "");
  }, [value, all]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((o) => {
      if (o.value === "") return true; // "automatica" resta sempre visibile
      return (
        o.value.toLowerCase().indexOf(q) !== -1 ||
        (o.label && o.label.toLowerCase().indexOf(q) !== -1)
      );
    });
  }, [all, query]);

  function select(opt: ComboboxOption) {
    onChange(opt.value);
    setQuery(opt.label);
    setOpen(false);
    setHighlight(-1);
    inputRef.current?.blur();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) { setOpen(true); setHighlight(visible.length > 0 ? 0 : -1); return; }
      setHighlight((h) => Math.min(h + 1, visible.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open && highlight >= 0 && highlight < visible.length) {
        e.preventDefault();
        select(visible[highlight]);
      } else if (!open) {
        setOpen(true);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Chiusura al click fuori dal componente.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: globalThis.MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="combobox" ref={containerRef}>
      <input
        ref={inputRef}
        className="combobox-input"
        type="text"
        placeholder={placeholder}
        autoComplete="off"
        aria-label={ariaLabel}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        onFocus={() => {
          setOpen(true);
          setHighlight(visible.length > 0 ? 0 : -1);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      <div className={`combobox-dropdown${open ? " open" : ""}`} role="listbox">
        {visible.length === 0 ? (
          <div className="combobox-empty">Nessun risultato</div>
        ) : (
          visible.map((opt, i) => (
            <div
              key={opt.value + "|" + i}
              role="option"
              aria-selected={opt.value === value}
              className={`combobox-option${opt.value === "" ? " auto-option" : ""}${i === highlight ? " highlighted" : ""}`}
              data-value={opt.value}
              onMouseDown={(e: MouseEvent) => { e.preventDefault(); select(opt); }}
              onMouseEnter={() => setHighlight(i)}
            >
              <span className="option-label">{opt.label}</span>
              {opt.meta ? <span className="option-meta">{opt.meta}</span> : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
