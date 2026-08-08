"use client";

import { useEffect, useState } from "react";
import Modal from "../../common/Modal";
import { api, ApiError } from "../../../lib/api";

interface Address {
  nome: string;
  via: string;
  cap: string;
  citta: string;
  prov: string;
}

interface OrderItem {
  codice: string;
  nome: string;
  qty: number;
  prezzo: number;
  listino: number;
}

interface OrderDetail {
  id: number;
  num: string;
  clienteNome: string;
  data: string;
  ora: string;
  stato: string;
  pagamento: string;
  totale: number;
  pezzi: number;
  spedizione: number;
  indirizzo: Address | null;
  notaSped?: string;
  items: OrderItem[];
}

const STATI: Record<string, string> = {
  confermato: "Confermato",
  inoltrato: "Inoltrato a fornitore",
  evaso: "Evaso",
  annullato: "Annullato",
  attesa: "In attesa",
};

const STATO_CLS: Record<string, string> = {
  confermato: "st-ok",
  inoltrato: "st-blue",
  evaso: "st-ok",
  annullato: "st-red",
  attesa: "st-amber",
};

function fmtEur(n: number): string {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function fmtDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function OrdineDetailModal({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get<OrderDetail>(`/api/admin/ordini/${orderId}`)
      .then(setOrder)
      .catch((e) => setError(e instanceof ApiError ? e.code : "errors.generic"))
      .finally(() => setLoading(false));
  }, [orderId]);

  return (
    <Modal open onClose={onClose} size="lg" noHeader>
      <div className="modal-root-header">
        <h2>{order ? `Ordine ${order.num}` : "Dettaglio ordine"}</h2>
        <button className="modal-root-close" onClick={onClose} aria-label="Chiudi">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="modal-root-body" style={{ padding: "24px 28px" }}>
        {loading && <p style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>Caricamento…</p>}
        {error && <p style={{ color: "var(--red)", textAlign: "center", padding: 40 }}>{error}</p>}

        {order && (
          <>
            {/* Grid 2-col: Cliente, Data, Stato, Pagamento */}
            <div className="detail-grid-2col">
              <div className="detail-section">
                <h3>Cliente</h3>
                <div style={{ fontWeight: 600 }}>{order.clienteNome}</div>
              </div>
              <div className="detail-section">
                <h3>Data</h3>
                <div style={{ fontFamily: "var(--font-mono)" }}>{fmtDate(order.data)} {order.ora}</div>
              </div>
              <div className="detail-section">
                <h3>Stato</h3>
                <span className={`status-pill ${STATO_CLS[order.stato] ?? "st-amber"}`}>
                  <span className="sd">●</span>{STATI[order.stato] ?? order.stato}
                </span>
              </div>
              <div className="detail-section">
                <h3>Pagamento</h3>
                <div style={{ fontFamily: "var(--font-mono)" }}>{order.pagamento}</div>
              </div>
            </div>

            {/* Spedizione */}
            <div className="detail-section">
              <h3>Spedizione</h3>
              {order.indirizzo ? (
                <>
                  <div className="detail-row"><span className="lbl">Destinatario</span><span className="val">{order.indirizzo.nome}</span></div>
                  <div className="detail-row"><span className="lbl">Indirizzo</span><span className="val">{order.indirizzo.via}</span></div>
                  <div className="detail-row">
                    <span className="lbl">CAP / Città</span>
                    <span className="val">{order.indirizzo.cap} {order.indirizzo.citta} ({order.indirizzo.prov})</span>
                  </div>
                  {order.notaSped && (
                    <div className="detail-row">
                      <span className="lbl">Nota</span>
                      <span className="val" style={{ fontFamily: "var(--font-body)" }}>{order.notaSped}</span>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color: "var(--muted)", fontSize: 13 }}>Annullato / nessuna spedizione</p>
              )}
            </div>

            <hr className="detail-divider" />

            {/* Articoli */}
            <div className="detail-section">
              <h3>Articoli</h3>
              <div className="detail-items">
                {order.items.map((item, i) => (
                  <div key={i} className="detail-item">
                    <span className="code">{item.codice}</span>
                    <span className="name">{item.nome}</span>
                    <span className="qty">{item.qty}×</span>
                    <span className="price">{fmtEur(item.qty * item.prezzo)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totale */}
            <div className="detail-total">
              <span>Totale ({order.pezzi} pz, IVA esclusa)</span>
              <span className="val">{fmtEur(order.totale)}</span>
            </div>
          </>
        )}
      </div>

      <div className="modal-root-footer">
        <button className="btn btn-secondary" onClick={onClose}>Chiudi</button>
      </div>
    </Modal>
  );
}
