"use client";

import { useState } from "react";
import Modal from "../../common/Modal";
import { api } from "../../../lib/api";
import { formatPrice } from "../../../lib/helpers";

function fmtDate(d: string | null): string {
  if (!d) return "sempre";
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function CouponReviewModal({ data, onBack, onClose, onSent }: {
  data: any;
  onBack: () => void;
  onClose: () => void;
  onSent: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const scopeLabel = data.scope === "all" ? "Tutto il catalogo" : `${data.scopeDetail || data.scope}`;

  async function handleSend() {
    setSending(true);
    try {
      const res = await api.post<{ id: number }>("/api/admin/coupon", {
        code: data.code, name: data.name, type: data.type, value: data.value,
        scope: data.scope, scopeDetail: data.scopeDetail || undefined,
        minOrder: data.minOrder ?? undefined, usage: data.usage,
        validFrom: data.validFrom, validTo: data.validTo || undefined,
        targetCount: data.targetCount, customerIds: data.customerIds,
      });
      await api.post(`/api/admin/coupon/${res.id}/send`, {});
      setSent(true);
      setTimeout(() => { setSent(false); setSending(false); onSent(); }, 3000);
    } catch { setSending(false); }
  }

  return (
    <Modal open size="sm" onClose={onClose} noHeader>
      <div className="modal-root-header"><h2>Riepilogo campagna</h2><button className="modal-root-close" onClick={onClose} aria-label="Chiudi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
      <div className="modal-root-body" style={{ padding: "24px 28px" }}>
        <h3 style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>Dati campagna</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20 }}>
          <div className="recap-row" style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}><span style={{ color: "var(--muted)" }}>Campagna</span><span style={{ fontWeight: 500 }}>{data.name}</span></div>
          <div className="recap-row" style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}><span style={{ color: "var(--muted)" }}>Codice</span><span style={{ fontWeight: 600, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>{data.code}</span></div>
          <div className="recap-row" style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}><span style={{ color: "var(--muted)" }}>Tipo sconto</span><span style={{ fontWeight: 500 }}>{data.typeLabel}</span></div>
          <div className="recap-row" style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}><span style={{ color: "var(--muted)" }}>Ambito</span><span style={{ fontWeight: 500 }}>{scopeLabel}</span></div>
          <div className="recap-row" style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}><span style={{ color: "var(--muted)" }}>Utilizzo</span><span style={{ fontWeight: 500 }}>{data.usage === "unlimited" ? "Illimitato" : data.usage === "once" ? "Una volta per cliente" : "Mono-uso"}</span></div>
          <div className="recap-row" style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}><span style={{ color: "var(--muted)" }}>Validità</span><span style={{ fontWeight: 500 }}>{fmtDate(data.validFrom)} → {fmtDate(data.validTo)}</span></div>
          <div className="recap-row" style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}><span style={{ color: "var(--muted)" }}>Destinatari</span><span style={{ fontWeight: 500 }}>{data.targetCount} clienti</span></div>
        </div>

        <h3 style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>Anteprima email</h3>
        <div style={{ padding: "14px 16px", background: "var(--fg-soft)", borderRadius: 8, border: "1px dashed var(--border)", fontSize: 13, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            Oggetto: <span style={{ fontWeight: 400 }}>Codice sconto esclusivo — {data.code}</span>
          </div>
          <div style={{ color: "var(--muted)" }}>
            Gentile [Nome Cliente],<br /><br />
            ti riserviamo un codice sconto esclusivo valido fino al {fmtDate(data.validTo)}.
            <div style={{ display: "inline-block", marginTop: 8, padding: "6px 16px", background: "var(--accent)", color: "#fff", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>{data.code}</div>
            <br /><br />
            {data.typeLabel} su {scopeLabel}.<br /><br />
            Usa il codice in fase di checkout. Non cumulabile con altre promozioni.<br /><br />
            Cordiali saluti,<br />Luis S.r.l.
          </div>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 12 }}>
          Verranno inviate <strong>{data.targetCount}</strong> email ai clienti selezionati.
        </p>
      </div>
      <div className="modal-root-footer">
        <button className="btn btn-secondary" onClick={onBack} disabled={sending}>← Modifica</button>
        {sent ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--green)", fontWeight: 600, fontSize: 14 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>
            Campagna inviata!
          </div>
        ) : (
          <button className="btn btn-primary" onClick={handleSend} disabled={sending}>
            {sending ? "Invio in corso…" : "✉ Invia campagna"}
          </button>
        )}
      </div>
    </Modal>
  );
}
