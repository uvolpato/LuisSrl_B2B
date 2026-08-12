"use client";

import Modal from "../../common/Modal";

interface EventLogItem {
  id: number;
  eventType: string;
  action: string;
  actorId: number | null;
  actorType: string | null;
  entity: string | null;
  entityId: string | null;
  data: any;
  requestId: string | null;
  ip: string | null;
  status: string;
  durationMs: number | null;
  createdAt: string;
}

export default function EventDetailModal({ event: e, onClose }: { event: EventLogItem; onClose: () => void }) {
  return (
    <Modal size="md" title={`Dettaglio evento #${e.id}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
        <div style={{ display: "flex", gap: 8 }}><strong style={{ minWidth: 100, color: "var(--muted)" }}>Tipo:</strong><span>{e.eventType}</span></div>
        <div style={{ display: "flex", gap: 8 }}><strong style={{ minWidth: 100, color: "var(--muted)" }}>Azione:</strong><span>{e.action}</span></div>
        <div style={{ display: "flex", gap: 8 }}><strong style={{ minWidth: 100, color: "var(--muted)" }}>Entità:</strong><span>{e.entity ? `${e.entity} / ${e.entityId}` : "—"}</span></div>
        <div style={{ display: "flex", gap: 8 }}><strong style={{ minWidth: 100, color: "var(--muted)" }}>Utente:</strong><span>{e.actorId ? `${e.actorType || "?"}#${e.actorId}` : "—"}</span></div>
        <div style={{ display: "flex", gap: 8 }}><strong style={{ minWidth: 100, color: "var(--muted)" }}>Data:</strong><span>{new Date(e.createdAt).toLocaleString("it-IT")}</span></div>
        <div style={{ display: "flex", gap: 8 }}><strong style={{ minWidth: 100, color: "var(--muted)" }}>Request ID:</strong><span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{e.requestId || "—"}</span></div>
        <div style={{ display: "flex", gap: 8 }}><strong style={{ minWidth: 100, color: "var(--muted)" }}>IP:</strong><span>{e.ip || "—"}</span></div>
        {e.data && (
          <div>
            <strong style={{ color: "var(--muted)", display: "block", marginBottom: 4 }}>Dati:</strong>
            <pre style={{ margin: 0, padding: 10, background: "var(--fg-soft)", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-mono)", maxHeight: 300, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {JSON.stringify(e.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  );
}
