"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { formatPrice } from "../../lib/helpers";
import { thumbUrl } from "../../lib/thumb";
import { useConfirm } from "../common/ConfirmProvider";

interface Offerta {
  id: string;
  nome: string;
  img: string | null;
  prezzo: number | null;
  varianteCodice: string | null;
  motivo: "riordino" | "cross-sell" | "up-sell";
  dettaglio: string;
  score: number;
}

const MOTIVO: Record<Offerta["motivo"], { txt: string; col: string }> = {
  riordino: { txt: "↻ Riordino", col: "#166534" },
  "cross-sell": { txt: "↗ Cross-sell", col: "#1d4ed8" },
  "up-sell": { txt: "⤴ Up-sell", col: "#7c3aed" },
};

export default function CustomerOfferte({ customerId }: { customerId: number }) {
  const confirm = useConfirm();
  const [offerte, setOfferte] = useState<Offerta[] | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get<Offerta[]>(`/api/admin/customers/${customerId}/offerte`)
      .then((o) => { setOfferte(o); setSel(new Set(o.filter((x) => x.varianteCodice).map((x) => x.id))); })
      .catch(() => setOfferte([]));
  }, [customerId]);

  function toggle(id: string) {
    setSel((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function creaOfferta() {
    const scelte = (offerte ?? []).filter((o) => sel.has(o.id) && o.varianteCodice);
    if (!scelte.length) return;
    if (!(await confirm({
      title: "Crea offerta",
      message: <>Creare un progetto/offerta con <strong>{scelte.length} prodotti</strong> per questo cliente?</>,
      confirmLabel: "Crea",
    }))) return;
    setBusy(true); setMsg(null); setErr(null);
    try {
      const res = await api.post<{ id: number; nome: string }>(`/api/admin/customers/${customerId}/offerta`, {
        varianti: scelte.map((o) => ({ codice: o.varianteCodice, quantita: 1 })),
      });
      setMsg(`Offerta creata: «${res.nome}» (progetto #${res.id}).`);
    } catch { setErr("Errore nella creazione dell'offerta"); }
    finally { setBusy(false); }
  }

  if (!offerte) return <p style={{ color: "var(--muted)" }}>Caricamento offerte…</p>;
  if (offerte.length === 0) return <p style={{ color: "var(--muted)" }}>Nessuna offerta suggerita: servono acquisti a catalogo ricorrenti o famiglie con best-seller.</p>;

  const nScelte = offerte.filter((o) => sel.has(o.id) && o.varianteCodice).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>{offerte.length} prodotti consigliati · {nScelte} selezionati</span>
        <button className="btn btn-primary btn-sm" onClick={creaOfferta} disabled={busy || nScelte === 0}>
          {busy ? "Creo…" : "Crea offerta"}
        </button>
      </div>
      {msg && <div className="notice notice-success" style={{ fontSize: 13 }}>{msg}</div>}
      {err && <div className="notice notice-error" style={{ fontSize: 13 }}>{err}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        {offerte.map((o) => {
          const m = MOTIVO[o.motivo];
          const on = sel.has(o.id);
          const selectable = !!o.varianteCodice;
          return (
            <div key={o.id} onClick={() => selectable && toggle(o.id)}
              style={{ border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`, borderRadius: 10, overflow: "hidden", background: "var(--surface)", cursor: selectable ? "pointer" : "default", opacity: selectable ? 1 : 0.6 }}>
              <div style={{ position: "relative", aspectRatio: "4/3", background: "var(--bg)" }}>
                {o.img && <img src={thumbUrl(o.img, 300)} alt={o.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                {selectable && <input type="checkbox" checked={on} readOnly style={{ position: "absolute", top: 6, left: 6, width: 16, height: 16 }} />}
                <span style={{ position: "absolute", bottom: 6, right: 6, background: m.col, color: "#fff", fontSize: 10, padding: "2px 6px", borderRadius: 999 }}>{m.txt}</span>
              </div>
              <div style={{ padding: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.nome}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", margin: "2px 0" }}>{o.prezzo != null ? formatPrice(o.prezzo) : "—"}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.3 }}>{o.dettaglio}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
