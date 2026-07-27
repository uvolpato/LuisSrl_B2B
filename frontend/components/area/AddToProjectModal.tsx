"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface Progetto { id: number; nome: string; count: number }

/** Modale per aggiungere una variante (con quantità) a un progetto esistente o nuovo. */
export default function AddToProjectModal({
  open, onClose, varianteCodice, quantita,
}: {
  open: boolean;
  onClose: () => void;
  varianteCodice: string | null;
  quantita: number;
}) {
  const [progetti, setProgetti] = useState<Progetto[] | null>(null);
  const [nuovo, setNuovo] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDone(null); setError(null); setNuovo("");
    api.get<Progetto[]>("/api/progetti").then(setProgetti).catch(() => setProgetti([]));
  }, [open]);

  async function addTo(progettoId: number, nome: string) {
    if (!varianteCodice || busy) return;
    setBusy(true); setError(null);
    try {
      await api.post(`/api/progetti/${progettoId}/items`, { varianteCodice, quantita });
      setDone(nome);
    } catch { setError("Non riuscito. Riprova."); }
    finally { setBusy(false); }
  }

  async function createAndAdd() {
    const n = nuovo.trim();
    if (!n || !varianteCodice || busy) return;
    setBusy(true); setError(null);
    try {
      const p = await api.post<{ id: number; nome: string }>("/api/progetti", { nome: n });
      await api.post(`/api/progetti/${p.id}/items`, { varianteCodice, quantita });
      setDone(p.nome);
    } catch { setError("Non riuscito. Riprova."); }
    finally { setBusy(false); }
  }

  if (!open) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "color-mix(in oklch, var(--fg) 40%, transparent)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 460, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 64px color-mix(in oklch, var(--fg) 18%, transparent)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 0" }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Aggiungi a un progetto</h3>
          <button onClick={onClose} aria-label="Chiudi" style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: "16px 20px 20px" }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <p style={{ margin: "0 0 16px", fontSize: 15 }}>Aggiunto a <strong>{done}</strong>.</p>
              <button className="btn btn-primary" onClick={onClose}>Chiudi</button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input
                  type="text" placeholder="Nuovo progetto…" value={nuovo}
                  onChange={(e) => setNuovo(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void createAndAdd(); }}
                  style={{ flex: 1, padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 10, background: "var(--bg)", font: "inherit", color: "var(--fg)" }}
                />
                <button className="btn btn-primary btn-sm" onClick={createAndAdd} disabled={busy || !nuovo.trim()}>Crea</button>
              </div>

              {!progetti && <p style={{ color: "var(--muted)", fontSize: 14 }}>Caricamento…</p>}
              {progetti && progetti.length === 0 && <p style={{ color: "var(--muted)", fontSize: 14 }}>Nessun progetto: creane uno qui sopra.</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(progetti ?? []).map((p) => (
                  <button
                    key={p.id} onClick={() => addTo(p.id, p.nome)} disabled={busy}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg)", cursor: "pointer", textAlign: "left", font: "inherit", color: "var(--fg)" }}
                  >
                    <span style={{ fontWeight: 600 }}>{p.nome}</span>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>{p.count} art.</span>
                  </button>
                ))}
              </div>
              {error && <p style={{ color: "var(--danger, #c0392b)", fontSize: 13, marginTop: 12 }}>{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
