"use client";

import { useMemo, useState } from "react";
import type { OrdineCliente } from "../../lib/types";
import Modal from "../common/Modal";
import DataTable, { type Column } from "../admin/DataTable";

type RigaOrdine = OrdineCliente["righe"][number];

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

  const start = (pagina - 1) * RIGHE_PER_PAGINA;
  const righePagina = righeOrdinate.slice(start, start + RIGHE_PER_PAGINA);

  const columns: Column<RigaOrdine>[] = [
    { key: "numeroRiga", header: "N°", width: "48px", align: "right", mono: true, sortable: true,
      sortValue: (r) => r.numeroRiga ?? 0,
      cell: (r) => r.numeroRiga ?? (start + righePagina.indexOf(r) + 1) },
    { key: "codiceProdotto", header: "Codice", width: "120px", mono: true, cell: (r) => r.codiceProdotto || "—" },
    { key: "descrizione", header: "Descrizione", grow: true, cell: (r) => r.descrizione || "—" },
    { key: "quantita", header: "Q.tà", width: "80px", align: "right", cell: (r) => (r.quantita ? Number(r.quantita) : "—") },
    { key: "prezzo", header: "Prezzo", width: "100px", align: "right", cell: (r) => (r.prezzo ? `€ ${Number(r.prezzo).toFixed(2)}` : "—") },
    { key: "importo", header: "Importo", width: "110px", align: "right", cell: (r) => {
        const imp = (Number(r.quantita) || 0) * (Number(r.prezzo) || 0);
        return imp ? `€ ${imp.toFixed(2)}` : "—";
      } },
  ];

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
        <DataTable
          columns={columns}
          rows={righePagina}
          rowKey={(r) => r.id}
          emptyText="Nessuna riga"
          page={pagina}
          pageSize={RIGHE_PER_PAGINA}
          total={ordine.righe.length}
          onPageChange={setPagina}
          sortKey="numeroRiga"
          sortDir={righeAsc ? "asc" : "desc"}
          onSort={() => { setRigheAsc((v) => !v); setPagina(1); }}
        />
      </div>
    </Modal>
  );
}
