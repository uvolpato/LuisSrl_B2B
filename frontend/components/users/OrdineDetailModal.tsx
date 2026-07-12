"use client";

import { useMemo, useState } from "react";
import type { OrdineCliente } from "../../lib/types";
import Modal from "../common/Modal";

const RIGHE_PER_PAGINA = 10;

function fmt(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("it-IT", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className={`detail-value${emphasize ? " detail-value-strong" : ""}`}>{value}</span>
    </div>
  );
}

export default function OrdineDetailModal({
  ordine,
  customerName,
  onClose,
}: {
  ordine: OrdineCliente;
  customerName?: string;
  onClose: () => void;
}) {
  const [pagina, setPagina] = useState(1);
  const [righeAsc, setRigheAsc] = useState(true);

  const calcTotale = ordine.righe.reduce((s, r) => s + (Number(r.quantita) || 0) * (Number(r.prezzo) || 0), 0);

  const righeOrdinate = useMemo(() => {
    return [...ordine.righe].sort((a, b) => {
      const aNull = a.numeroRiga == null;
      const bNull = b.numeroRiga == null;
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      const c = Number(a.numeroRiga) - Number(b.numeroRiga);
      return righeAsc ? c : -c;
    });
  }, [ordine.righe, righeAsc]);

  const totalePagine = Math.max(1, Math.ceil(righeOrdinate.length / RIGHE_PER_PAGINA));
  const start = (pagina - 1) * RIGHE_PER_PAGINA;
  const righePagina = righeOrdinate.slice(start, start + RIGHE_PER_PAGINA);

  return (
    <Modal
      title={`${customerName ? `${customerName} · ` : ""}Ordine #${ordine.numeroOrdine}`}
      bodyClassName="ordine-detail-body"
      onClose={onClose}
    >
      <div className="ordine-detail">
        <div className="detail-grid detail-grid-compact detail-grid-2">
          <Row label="Numero ordine" value={ordine.numeroOrdine} />
          <Row label="Data" value={fmt(ordine.dataOrdine)} />
        </div>
        <div className="detail-grid detail-grid-compact">
          <Row label="Stato" value={ordine.stato || "—"} />
          <Row label="Porto" value={ordine.codicePorto || "—"} />
          <Row label="Spedizione" value={ordine.codiceSpedizione || "—"} />
          <Row label="Vettore" value={ordine.codiceVettore || "—"} />
          <Row label="Pagamento" value={ordine.codicePagamento || "—"} />
          <Row label="Totale" value={calcTotale > 0 ? `€ ${calcTotale.toFixed(2)}` : "—"} emphasize />
        </div>

        {ordine.notaSpedizione && (
          <div className="detail-note">
            <span className="detail-label">Nota spedizione</span>
            <p>{ordine.notaSpedizione}</p>
          </div>
        )}
        {ordine.notaOrdine && (
          <div className="detail-note">
            <span className="detail-label">Nota ordine</span>
            <p>{ordine.notaOrdine}</p>
          </div>
        )}

        <h4 className="detail-section-title">Articoli ({ordine.righe.length})</h4>
        <div className="data-table">
          <div className="data-table-scroll">
            <table>
              <thead>
                <tr>
                  <th
                    className="sortable"
                    style={{ textAlign: "right", width: 48 }}
                    onClick={() => { setRigheAsc((v) => !v); setPagina(1); }}
                  >
                    N°<span className="sort-arrow">{righeAsc ? " ▲" : " ▼"}</span>
                  </th>
                  <th>Codice</th>
                  <th>Descrizione</th>
                  <th style={{ textAlign: "right" }}>Q.tà</th>
                  <th style={{ textAlign: "right" }}>Prezzo</th>
                  <th style={{ textAlign: "right" }}>Importo</th>
                </tr>
              </thead>
              <tbody>
                {righePagina.map((r, i) => {
                  const qta = r.quantita ? Number(r.quantita) : 0;
                  const prezzo = r.prezzo ? Number(r.prezzo) : 0;
                  const importo = qta * prezzo;
                  return (
                    <tr key={r.id}>
                      <td style={{ textAlign: "right" }} className="mono">{r.numeroRiga ?? start + i + 1}</td>
                      <td className="mono">{r.codiceProdotto || "—"}</td>
                      <td>{r.descrizione || "—"}</td>
                      <td style={{ textAlign: "right" }}>{qta || "—"}</td>
                      <td style={{ textAlign: "right" }}>{prezzo ? `€ ${prezzo.toFixed(2)}` : "—"}</td>
                      <td style={{ textAlign: "right" }}>{importo ? `€ ${importo.toFixed(2)}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {ordine.righe.length > RIGHE_PER_PAGINA && (
            <div className="data-table-footer">
              <span className="data-table-range">
                {start + 1}–{Math.min(start + RIGHE_PER_PAGINA, ordine.righe.length)} di {ordine.righe.length}
              </span>
              <div className="pager">
                <button
                  type="button"
                  disabled={pagina <= 1}
                  onClick={() => setPagina(pagina - 1)}
                  aria-label="Pagina precedente"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <span className="pager-current">{pagina} / {totalePagine}</span>
                <button
                  type="button"
                  disabled={pagina >= totalePagine}
                  onClick={() => setPagina(pagina + 1)}
                  aria-label="Pagina successiva"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
