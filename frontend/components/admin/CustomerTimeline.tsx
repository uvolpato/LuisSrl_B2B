"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface Evento {
  id: number;
  tipo: string;
  entita: string | null;
  entitaId: string | null;
  dettagli: Record<string, unknown> | null;
  createdAt: string;
}

function label(e: Evento): string {
  const d = e.dettagli ?? {};
  const art = (d.nome as string) || e.entitaId || "";
  switch (e.tipo) {
    case "login": return "Accesso";
    case "logout": return "Uscita";
    case "articolo.view": return `Ha aperto ${art}`;
    case "ricerca": return d.tipo === "immagine"
      ? `Ricerca per immagine · ${d.n ?? 0} risultati`
      : `Ricerca «${d.q ?? ""}» · ${d.n ?? 0} risultati`;
    case "carrello.add": return `Aggiunto al carrello ${e.entitaId} ×${d.quantita ?? ""}`;
    case "carrello.update": return `Quantità aggiornata ${e.entitaId} → ${d.quantita ?? ""}`;
    case "carrello.remove": return `Rimosso dal carrello ${e.entitaId}`;
    case "ordine.create": return `Ordine creato ${e.entitaId} · € ${d.importo ?? ""}`;
    default: return e.tipo;
  }
}

const DOT: Record<string, string> = {
  login: "var(--accent)", logout: "var(--muted)",
  "articolo.view": "#3b82f6", ricerca: "#8b5cf6",
  "carrello.add": "#16a34a", "carrello.update": "#16a34a", "carrello.remove": "#dc2626",
  "ordine.create": "#d97706",
};

function fmt(ts: string): string {
  return new Date(ts).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function CustomerTimeline({ customerId }: { customerId: number }) {
  const [eventi, setEventi] = useState<Evento[] | null>(null);

  useEffect(() => {
    api.get<Evento[]>(`/api/customers/${customerId}/eventi`).then(setEventi).catch(() => setEventi([]));
  }, [customerId]);

  if (!eventi) return <p style={{ color: "var(--muted)" }}>Caricamento…</p>;
  if (eventi.length === 0) return <p style={{ color: "var(--muted)" }}>Nessuna attività registrata.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {eventi.map((e) => (
        <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: DOT[e.tipo] ?? "var(--muted)", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)", minWidth: 96 }}>{fmt(e.createdAt)}</span>
          <span style={{ fontSize: 14 }}>{label(e)}</span>
        </div>
      ))}
    </div>
  );
}
