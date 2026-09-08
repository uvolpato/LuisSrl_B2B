"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
  BOZZA: "Da esportare",
};

const STATO_CLS: Record<string, string> = {
  confermato: "st-ok",
  inoltrato: "st-blue",
  evaso: "st-ok",
  annullato: "st-red",
  attesa: "st-amber",
};

// Stati gestibili dall'admin nel portale B2B (ciclo d'ordine). 'BOZZA' rimette
// l'ordine in coda export: il backend azzera il flag di esportazione e il run
// successivo rigenera l'Excel.
const STATI_EDITABILI: { value: string; label: string }[] = [
  { value: "attesa", label: "In attesa" },
  { value: "confermato", label: "Confermato" },
  { value: "inoltrato", label: "Inoltrato a fornitore" },
  { value: "evaso", label: "Evaso" },
  { value: "annullato", label: "Annullato" },
  { value: "BOZZA", label: "Da esportare — ricrea Excel" },
];

function fmtEur(n: number): string {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function fmtDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function OrdineDetailModal({ orderId, onClose, onSaved }: { orderId: number; onClose: () => void; onSaved?: () => void }) {
  const tServer = useTranslations("server");
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statoSel, setStatoSel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<OrderDetail>(`/api/admin/ordini/${orderId}`)
      .then((o) => {
        setOrder(o);
        setStatoSel(o.stato ?? "attesa");
      })
      .catch((e) => setError(e instanceof ApiError ? e.code : "errors.generic"))
      .finally(() => setLoading(false));
  }, [orderId]);

  const statiOptions = order
    ? [...STATI_EDITABILI, ...(order.stato && !STATI_EDITABILI.some((s) => s.value === order.stato) ? [{ value: order.stato, label: order.stato }] : [])]
    : STATI_EDITABILI;

  const salvaStato = async () => {
    if (!order || statoSel === order.stato) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await api.patch<{ id: number; stato: string }>(`/api/admin/ordini/${order.id}/stato`, { stato: statoSel });
      setOrder({ ...order, stato: statoSel });
      setSaved(true);
      onSaved?.();
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.code : "errors.generic");
    } finally {
      setSaving(false);
    }
  };

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
        {error && <p style={{ color: "var(--red)", textAlign: "center", padding: 40 }}>{tServer(error)}</p>}

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
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
                  <label style={{ fontSize: 13, color: "var(--muted)" }} htmlFor="stato-forza">Forza stato</label>
                  <select
                    id="stato-forza"
                    className="input"
                    value={statoSel}
                    onChange={(e) => setStatoSel(e.target.value)}
                    disabled={saving}
                    style={{ minWidth: 220, maxWidth: "100%" }}
                  >
                    {statiOptions.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={salvaStato}
                    disabled={saving || statoSel === order.stato}
                  >
                    {saving ? "Salvataggio…" : "Salva"}
                  </button>
                </div>
                {saveError && <p style={{ color: "var(--red)", fontSize: 13, marginTop: 8 }}>{tServer(saveError)}</p>}
                {saved && <p style={{ color: "var(--green)", fontSize: 13, marginTop: 8 }}>Stato aggiornato.</p>}
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
