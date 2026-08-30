"use client";

import Modal from "../../common/Modal";

interface EventLogItem {
  id: string;
  azione: string;
  actorId: number | null;
  actorType: string | null;
  entita: string | null;
  entitaId: string | null;
  dettagli: any;
  esito: string;
  ip: string | null;
  requestId: string | null;
  durationMs: number | null;
  createdAt: string;
}

function categoriaDi(azione: string): "access" | "error" | "audit" {
  if (azione === "http.access") return "access";
  if (azione === "http.error") return "error";
  return "audit";
}

export default function EventDetailModal({ event: e, onClose }: { event: EventLogItem; onClose: () => void }) {
  return (
    <Modal size="md" title={`Dettaglio evento #${e.id}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
        <div style={{ display: "flex", gap: 8 }}><strong style={{ minWidth: 100, color: "var(--muted)" }}>Tipo:</strong><span>{categoriaDi(e.azione)}</span></div>
        <div style={{ display: "flex", gap: 8 }}><strong style={{ minWidth: 100, color: "var(--muted)" }}>Azione:</strong><span>{e.dettagli?.label ?? e.azione}</span></div>
        <div style={{ display: "flex", gap: 8 }}><strong style={{ minWidth: 100, color: "var(--muted)" }}>Entità:</strong><span>{e.entita ? `${e.entita} / ${e.entitaId}` : "—"}</span></div>
        <div style={{ display: "flex", gap: 8 }}><strong style={{ minWidth: 100, color: "var(--muted)" }}>Utente:</strong><span>{e.actorId ? `${e.actorType || "?"}#${e.actorId}` : "—"}</span></div>
        <div style={{ display: "flex", gap: 8 }}><strong style={{ minWidth: 100, color: "var(--muted)" }}>Esito:</strong><span style={{ color: e.esito === "KO" ? "var(--red)" : "var(--green)", fontWeight: 600 }}>{e.esito}</span></div>
        <div style={{ display: "flex", gap: 8 }}><strong style={{ minWidth: 100, color: "var(--muted)" }}>Durata:</strong><span>{e.durationMs != null ? `${e.durationMs} ms` : "—"}</span></div>
        <div style={{ display: "flex", gap: 8 }}><strong style={{ minWidth: 100, color: "var(--muted)" }}>Data:</strong><span>{new Date(e.createdAt).toLocaleString("it-IT")}</span></div>
        <div style={{ display: "flex", gap: 8 }}><strong style={{ minWidth: 100, color: "var(--muted)" }}>Request ID:</strong><span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{e.requestId || "—"}</span></div>
        <div style={{ display: "flex", gap: 8 }}><strong style={{ minWidth: 100, color: "var(--muted)" }}>IP:</strong><span>{e.ip || "—"}</span></div>
        {e.dettagli && (
          <div>
            <strong style={{ color: "var(--muted)", display: "block", marginBottom: 4 }}>Dati:</strong>
            <pre style={{ margin: 0, padding: 10, background: "var(--fg-soft)", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-mono)", maxHeight: 300, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {JSON.stringify(e.dettagli, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  );
}
