"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "../../../lib/api";
import DataTable, { type Column } from "../DataTable";
import Notice from "../../common/Notice";
import { PAGE_SIZE } from "../types";
import { IconRefresh } from "../icons";

type SyncProgress = { running: boolean; pct: number; phase: string; errorText?: string };


interface Listino {
  codice: string;
  descrizione: string;
}

interface RigaListino {
  idRiga: number;
  codiceListino: string;
  codiceProdotto: string;
  idVariante: string | null;
  descrizione: string | null;
  prezzo: number | null;
  sconto1: number | null;
  sconto2: number | null;
  sconto3: number | null;
  sconto4: number | null;
}

interface RigheResponse {
  items: RigaListino[];
  total: number;
  page: number;
  limit: number;
}

export default function ListiniSection() {
  const [listini, setListini] = useState<Listino[]>([]);
  const [selectedListino, setSelectedListino] = useState("");

  const [items, setItems] = useState<RigaListino[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncFlash, setSyncFlash] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [listiniLoaded, setListiniLoaded] = useState(false);

  async function doSync() {
    setSyncing(true);
    setSyncProgress(null);
    setSyncFlash(null);
    setSyncError(null);
    try {
      await api.post<{ status: string }>("/api/integrazione/sync/listini");
      await new Promise<void>((resolve) => {
        pollRef.current = setInterval(async () => {
          try {
            const p = await api.get<SyncProgress>("/api/integrazione/sync/progress");
            setSyncProgress(p);
            if (!p.running) {
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = null;
              if (p.phase.startsWith("Err") || p.phase.startsWith("Errore")) {
                setSyncFlash("Errore");
                setSyncError(p.errorText ?? "Errore sconosciuto");
                flashRef.current = setTimeout(() => setSyncFlash(null), 3000);
                setSyncing(false);
              }
              resolve();
            }
          } catch { resolve(); }
        }, 500);
      });
      if (!syncError) {
        setSyncFlash("OK");
        flashRef.current = setTimeout(() => setSyncFlash(null), 2000);
        setSyncing(false);
        api.get<Listino[]>("/api/integrazione/listini").then((data) => { setListini(data); });
        if (selectedListino) loadRighe();
      }
    } catch {
      setSyncFlash("Errore");
      setSyncError("Errore nella sincronizzazione");
      setSyncing(false);
    }
  }

  function loadRighe() {
    if (!selectedListino) return;
    setLoading(true);
    api.get<RigheResponse>(
      `/api/integrazione/listini/${selectedListino}/righe?search=${encodeURIComponent(search)}&page=${page}&limit=${PAGE_SIZE}`
    )
      .then((data) => { setItems(data.items); setTotal(data.total); })
      .catch(() => setError("Errore nel caricamento delle righe"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadRighe(); }, [selectedListino, search, page]);

  useEffect(() => {
    api.get<Listino[]>("/api/integrazione/listini")
      .then((data) => {
        setListini(data);
        if (data.length > 0) setSelectedListino(data[0].codice);
      })
      .catch(() => setError("Errore nel caricamento dei listini"))
      .finally(() => setListiniLoaded(true));
  }, []);

  function handleListinoChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedListino(e.target.value);
    setPage(1);
  }

  const columns: Column<RigaListino>[] = [
    {
      key: "codiceProdotto",
      header: "Codice Prodotto",
      width: "140px",
      sortable: true,
      cell: (r) => (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{r.codiceProdotto}</span>
      ),
    },
    {
      key: "descrizione",
      header: "Descrizione",
      grow: true,
      sortable: true,
      sortValue: (r) => r.descrizione ?? "",
      cell: (r) => (
        <span style={{ color: "var(--muted)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
          {r.descrizione || "—"}
        </span>
      ),
    },
    {
      key: "idVariante",
      header: "Variante",
      width: "120px",
      sortable: true,
      cell: (r) => (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--muted)" }}>
          {r.idVariante || "—"}
        </span>
      ),
    },
    {
      key: "prezzo",
      header: "Prezzo",
      width: "100px",
      align: "right",
      sortable: true,
      sortValue: (r) => r.prezzo ?? 0,
      cell: (r) => (
        <span style={{ fontWeight: 600 }}>
          {r.prezzo != null ? `€ ${r.prezzo.toFixed(2)}` : "—"}
        </span>
      ),
    },
    {
      key: "sconto1",
      header: "Sconto 1",
      width: "90px",
      align: "right",
      sortable: true,
      sortValue: (r) => r.sconto1 ?? 0,
      cell: (r) => (
        <span style={{ color: "var(--muted)", fontSize: 13 }}>
          {r.sconto1 != null ? `${r.sconto1}%` : "—"}
        </span>
      ),
    },
    {
      key: "sconto2",
      header: "Sconto 2",
      width: "90px",
      align: "right",
      sortable: true,
      sortValue: (r) => r.sconto2 ?? 0,
      cell: (r) => (
        <span style={{ color: "var(--muted)", fontSize: 13 }}>
          {r.sconto2 != null ? `${r.sconto2}%` : "—"}
        </span>
      ),
    },
    {
      key: "sconto3",
      header: "Sconto 3",
      width: "90px",
      align: "right",
      sortable: true,
      sortValue: (r) => r.sconto3 ?? 0,
      cell: (r) => (
        <span style={{ color: "var(--muted)", fontSize: 13 }}>
          {r.sconto3 != null ? `${r.sconto3}%` : "—"}
        </span>
      ),
    },
    {
      key: "sconto4",
      header: "Sconto 4",
      width: "90px",
      align: "right",
      sortable: true,
      sortValue: (r) => r.sconto4 ?? 0,
      cell: (r) => (
        <span style={{ color: "var(--muted)", fontSize: 13 }}>
          {r.sconto4 != null ? `${r.sconto4}%` : "—"}
        </span>
      ),
    },
  ];

  const meta = `${total} righe`;

  return (
    <>
      <header className="admin-top">
        <h1>Listini</h1>
        <div className="top-actions">
          <select className="input" value={selectedListino} onChange={handleListinoChange} style={{ width: 260 }}>
            {!listiniLoaded && <option value="">Caricamento…</option>}
            {listini.map((l) => (
              <option key={l.codice} value={l.codice}>
                {l.codice} — {l.descrizione}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={doSync} disabled={syncing} style={{ minWidth: 130, justifyContent: "center" }}>
            <span className={`sync-icon ${syncing ? "spin" : ""}`}>{IconRefresh}</span>
            <span>{syncing && syncProgress ? `${syncProgress.pct}%` : syncFlash ?? "Sincronizza"}</span>
          </button>
          <div className="admin-search">
            <span className="search-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Cerca codice, descrizione…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </header>

      <div className="admin-content">
        {selectedListino && (
          <div className="content-header">
            <span className="meta">{meta}</span>
          </div>
        )}

        {error && <Notice variant="error" onClose={() => setError(null)}>{error}</Notice>}
        {syncError && <Notice variant="error" onClose={() => setSyncError(null)} style={{ marginBottom: 8 }}>{syncError}</Notice>}

        <DataTable
          columns={columns}
          rows={items}
          rowKey={(r) => r.idRiga}
          emptyText={selectedListino ? "Nessuna riga trovata" : "Seleziona un listino per visualizzare le righe"}
          loading={loading}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}
