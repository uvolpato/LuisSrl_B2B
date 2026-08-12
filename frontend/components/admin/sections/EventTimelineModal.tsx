"use client";

import { useEffect, useState } from "react";
import Modal from "../../common/Modal";
import { api } from "../../../lib/api";

interface EventLogItem {
  id: number;
  eventType: string;
  action: string;
  data: any;
  createdAt: string;
}

function fmtDt(d: string): string {
  return new Date(d).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function EventTimelineModal({ entity, entityId, onClose }: { entity: string; entityId: string; onClose: () => void }) {
  const [items, setItems] = useState<EventLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<EventLogItem[]>(`/api/admin/event-log/entity/${encodeURIComponent(entity)}/${encodeURIComponent(entityId)}`)
      .then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, [entity, entityId]);

  return (
    <Modal size="md" title={`Timeline — ${entity} / ${entityId}`} onClose={onClose}>
      {loading ? (
        <p style={{ color: "var(--muted)", textAlign: "center", padding: 20 }}>Caricamento…</p>
      ) : items.length === 0 ? (
        <p style={{ color: "var(--muted)", textAlign: "center", padding: 20 }}>Nessun evento.</p>
      ) : (
        <div style={{ position: "relative", paddingLeft: 24 }}>
          <div style={{ position: "absolute", left: 7, top: 0, bottom: 0, width: 2, background: "var(--border)" }} />
          {items.map((e) => (
            <div key={e.id} style={{ position: "relative", paddingBottom: 16 }}>
              <div style={{ position: "absolute", left: -21, top: 4, width: 10, height: 10, borderRadius: "50%", background: e.eventType === "error" ? "var(--red)" : e.eventType === "mutation" ? "var(--blue)" : "var(--accent)", border: "2px solid var(--surface)" }} />
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>{fmtDt(e.createdAt)}</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{e.action}</div>
              {e.data?.old && e.data?.new && (
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  <span style={{ textDecoration: "line-through", color: "var(--red)" }}>{JSON.stringify(e.data.old)}</span>
                  {" → "}
                  <span style={{ color: "var(--green)" }}>{JSON.stringify(e.data.new)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
