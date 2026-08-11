"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "../../common/Modal";
import DataTable from "../DataTable";
import type { Column, RowAction } from "../DataTable";
import { api } from "../../../lib/api";
import { formatPrice } from "../../../lib/helpers";

const stl: Record<string, any> = { width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", font: "inherit", fontSize: 14, color: "var(--fg)", boxSizing: "border-box" };

export default function CouponEditorModal({ onClose, onSaved, initial }: { onClose: () => void; onSaved: () => void; initial?: any }) {
  const isEdit = !!initial;
  const [step, setStep] = useState<"dati" | "destinatari">("dati");

  // Step 1: Dati coupon
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? "pct");
  const [value, setValue] = useState(initial?.value ? Number(initial.value) : 10);
  const [scope, setScope] = useState(initial?.scope ?? "all");
  const [scopeDetail, setScopeDetail] = useState(initial?.scopeDetail ?? "");
  const [minOrder, setMinOrder] = useState(initial?.minOrder ? String(initial.minOrder) : "");
  const [usage, setUsage] = useState(initial?.usage ?? "unlimited");
  const [validFrom, setValidFrom] = useState(initial?.validFrom?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [validTo, setValidTo] = useState(initial?.validTo?.slice(0, 10) ?? "");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [usages, setUsages] = useState<any[]>([]);
  const [targetClients, setTargetClients] = useState<any[]>([]);
  const [usagesLoaded, setUsagesLoaded] = useState(false);

  useEffect(() => {
    if (isEdit && initial?.id) {
      Promise.all([
        api.get<any[]>(`/api/admin/coupon/${initial.id}/usage`),
        api.get<any[]>(`/api/admin/coupon/${initial.id}/clients`),
      ]).then(([u, c]) => { setUsages(u); setTargetClients(c); }).catch(() => {}).finally(() => setUsagesLoaded(true));
    }
  }, [isEdit, initial?.id]);

  async function revokeUsage(usageId: number) {
    if (!confirm("Revocare questo utilizzo? Il cliente potrà usare di nuovo il coupon.")) return;
    try {
      await api.patch(`/api/admin/coupon/${initial.id}/revoke/${usageId}`);
      const updated = await api.get<any[]>(`/api/admin/coupon/${initial.id}/usage`);
      setUsages(updated);
    } catch {}
  }

  // Step 2: Destinatari
  const [segCount, setSegCount] = useState(0);
  const [segged, setSegged] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showClientList, setShowClientList] = useState(false);
  const [filtroRegione, setFiltroRegione] = useState("");
  const [filtroUltimo, setFiltroUltimo] = useState("");
  const [filtroSconto, setFiltroSconto] = useState("");
  const [filtroVolume, setFiltroVolume] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get<any[]>("/api/admin/coupon/ai-suggestions").then(setAiSuggestions).catch(() => {}); }, []);

  const updateQR = useCallback(async (c: string) => {
    if (!c) { setQrCode(null); return; }
    try { const res = await api.post<{ qrCode: string }>("/api/admin/coupon/qrcode", { code: c }); if (res.qrCode) setQrCode(res.qrCode); } catch { setQrCode(null); }
  }, []);

  useEffect(() => { updateQR(code); }, [code, updateQR]);

  function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let r = ""; for (let i = 0; i < 8; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
    setCode(r);
  }

  const applyFilters = useCallback(async () => {
    const filters: any[] = [];
    if (filtroRegione) filters.push({ field: "regione", value: filtroRegione });
    if (filtroUltimo) filters.push({ field: "ultimoOrdine", value: filtroUltimo });
    if (filtroSconto) filters.push({ field: "scontoMedio", value: filtroSconto });
    if (filtroVolume) filters.push({ field: "volume", value: filtroVolume });
    if (filters.length === 0) { setSegCount(0); setSegged([]); return; }
    try { const res = await api.post<{ count: number; customers: any[] }>("/api/admin/coupon/preview-segment", { filters }); setSegCount(res.count); setSegged(res.customers); } catch { setSegCount(0); }
  }, [filtroRegione, filtroUltimo, filtroSconto, filtroVolume]);

  useEffect(() => { applyFilters(); }, [applyFilters]);

  async function searchClients() {
    if (!clientSearch.trim()) return;
    try {       const list = await api.get<any>(`/api/customers?q=${encodeURIComponent(clientSearch)}`);
      setSearchResults(list?.items ?? list ?? []); } catch { setSearchResults([]); }
  }

  function toggleClient(id: number) {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  function applyAISuggestion(s: any) {
    setFiltroRegione(s.filters?.regione ?? ""); setFiltroUltimo(s.filters?.ultimo ?? ""); setFiltroSconto(s.filters?.sconto ?? ""); setFiltroVolume(s.filters?.volume ?? "");
  }

  async function handleCreate() {
    if (!code || !name) { alert("Inserisci codice e nome campagna."); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/api/admin/coupon/${initial.id}`, {
          name, type, value, scope, scopeDetail: scopeDetail || undefined,
          minOrder: minOrder || undefined, usage, validFrom, validTo: validTo || undefined,
        });
      } else {
        await api.post("/api/admin/coupon", {
          code, name, type, value, scope, scopeDetail: scopeDetail || undefined,
          minOrder: minOrder || undefined, usage, validFrom, validTo: validTo || undefined,
          targetCount: segCount + selectedIds.size, customerIds: [...selectedIds],
        });
      }
      setSaving(false);
      onSaved();
    } catch { setSaving(false); }
  }

  const iconCal = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

  return (
    <Modal open size="sm" onClose={onClose} noHeader>
      <div className="modal-root-header"><h2>{isEdit ? "Modifica campagna" : "Nuova campagna"}</h2><button className="modal-root-close" onClick={onClose} aria-label="Chiudi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>

      {step === "dati" && (
        <>
          <div className="modal-root-body" style={{ padding: "24px 28px" }}>
            <h3 style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>Dati coupon</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, display: "block", marginBottom: 4 }}>Codice</label>
                <div style={{ display: "flex", gap: 8 }}><input style={{ ...stl, fontFamily: "var(--font-mono)", textTransform: "uppercase" }} value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="es. ESTATE25" /><button className="btn btn-secondary btn-sm" onClick={generateCode} style={{ whiteSpace: "nowrap" }}>Genera</button></div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, display: "block", marginBottom: 4 }}>Nome campagna</label>
                <input style={stl} value={name} onChange={e => setName(e.target.value)} placeholder="es. Promo Estate 2026" />
              </div>
              <div><label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, display: "block", marginBottom: 4 }}>Tipo sconto</label><select style={stl} value={type} onChange={e => setType(e.target.value)}><option value="pct">Percentuale</option><option value="fixed">Importo fisso</option><option value="free-ship">Spedizione gratuita</option></select></div>
              <div><label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, display: "block", marginBottom: 4 }}>Valore</label><input style={{ ...stl, opacity: type === "free-ship" ? 0.4 : 1 }} type="number" min={1} value={value} onChange={e => setValue(Number(e.target.value) || 0)} disabled={type === "free-ship"} /></div>
              <div><label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, display: "block", marginBottom: 4 }}>Ambito</label><select style={{ ...stl, opacity: type === "free-ship" ? 0.4 : 1 }} value={scope} onChange={e => setScope(e.target.value)} disabled={type === "free-ship"}><option value="all">Tutto il catalogo</option><option value="family">Famiglia specifica</option><option value="collection">Raccolta</option></select></div>
              <div><label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, display: "block", marginBottom: 4 }}>Dettaglio ambito</label><select style={{ ...stl, opacity: scope === "all" || type === "free-ship" ? 0.4 : 1, pointerEvents: scope === "all" || type === "free-ship" ? "none" : "auto" }} value={scopeDetail} onChange={e => setScopeDetail(e.target.value)} disabled={type === "free-ship"}><option value="">Seleziona...</option>{scope === "family" && ["Vasi in terracotta","Cotto portoghese","Fioriere"].map(f => <option key={f} value={f}>{f}</option>)}{scope === "collection" && ["Novità 2026","Natale","Primavera"].map(f => <option key={f} value={f}>{f}</option>)}</select></div>
              <div><label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, display: "block", marginBottom: 4 }}>Soglia min. ordine</label><input style={{ ...stl, opacity: type === "free-ship" ? 0.4 : 1 }} type="number" min={0} value={minOrder} onChange={e => setMinOrder(e.target.value)} placeholder="Nessuna soglia" disabled={type === "free-ship"} /></div>
              <div><label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, display: "block", marginBottom: 4 }}>Utilizzo</label><select style={stl} value={usage} onChange={e => setUsage(e.target.value)}><option value="unlimited">Illimitato</option><option value="once">Una volta per cliente</option><option value="single">Mono-uso</option></select></div>
              <div><label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, display: "block", marginBottom: 4 }}>Valido dal</label><input style={stl} type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} /></div>
              <div><label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, display: "block", marginBottom: 4 }}>Valido al</label><input style={stl} type="date" value={validTo} onChange={e => setValidTo(e.target.value)} /></div>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 16, alignItems: "start" }}>
              <div style={{ width: 100, height: 100, border: "1px solid var(--border)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--fg-soft)", flexShrink: 0 }}>{qrCode ? <img src={qrCode} alt="QR" style={{ width: 96, height: 96 }} /> : <span style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", padding: 8 }}>Inserisci un codice</span>}</div>
              <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, margin: 0, flex: 1 }}>Il QR code sarà incluso nell'email. Il cliente potrà scansionarlo per applicare lo sconto automaticamente in fase di checkout.</p>
            </div>

            {isEdit && (
              <div style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>Utilizzi</h3>
                {usages.length === 0 ? (
                  <p style={{ color: "var(--muted)", fontSize: 13 }}>Nessun utilizzo registrato.</p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead><tr style={{ textAlign: "left", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase" }}>
                      <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)" }}>Cliente ID</th>
                      <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)" }}>Ordine</th>
                      <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)" }}>Importo</th>
                      <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)" }}>Data</th>
                      <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)" }}></th>
                    </tr></thead>
                    <tbody>{usages.map((u: any) => (
                      <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "6px 8px" }}><strong>{u.customerId}</strong></td>
                        <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>#{u.orderId || "—"}</td>
                        <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)", fontSize: 11 }}>{u.importo ? `€ ${Number(u.importo).toFixed(2)}` : "—"}</td>
                        <td style={{ padding: "6px 8px", fontSize: 11, color: "var(--muted)" }}>{new Date(u.usedAt).toLocaleDateString("it-IT")}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right" }}>
                          {u.revoked ? <span style={{ fontSize: 10, color: "var(--muted)", background: "var(--fg-soft)", padding: "2px 6px", borderRadius: 999 }}>Revocato</span> : <button className="btn btn-ghost btn-sm" onClick={() => revokeUsage(u.id)} style={{ fontSize: 11, color: "var(--red)", padding: "1px 8px" }}>Revoca</button>}
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            )}
          </div>
          <div className="modal-root-footer"><button className="btn btn-secondary" onClick={onClose}>Annulla</button><button className="btn btn-primary" onClick={() => setStep("destinatari")}>Destinatari →</button></div>
        </>
      )}

      {step === "destinatari" && (
        <>
          <div className="modal-root-body" style={{ padding: "24px 28px", display: "flex", flexDirection: "column", overflow: "visible" }}>
            <h3 style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px", paddingBottom: 8, borderBottom: "1px solid var(--border)", flexShrink: 0 }}>Destinatari</h3>

            {isEdit ? (
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <DataTable
                columns={[
                  { key: "nome", header: "Cliente", grow: true, cell: (c: any) => c.nome },
                  { key: "codiceCliente", header: "Codice", width: "100px", mono: true, cell: (c: any) => c.codiceCliente || "—" },
                  { key: "usato", header: "Utilizzo", width: "160px", cell: (c: any) => c.usato
                    ? <span style={{ fontSize: 11, color: c.usage?.revoked ? "var(--muted)" : "var(--green)" }}>{c.usage?.revoked ? "Revocato" : `Usato ord.#${c.usage?.orderId || "—"} ${c.usage?.importo ? `€${Number(c.usage.importo).toFixed(0)}` : ""}`}</span>
                    : <span style={{ fontSize: 11, color: "var(--muted)" }}>Non usato</span> },
                ]}
                rows={targetClients}
                rowKey={(c: any) => c.id}
                actions={[
                  {
                    icon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M18 6L6 18M6 6l12 12"/></svg>,
                    tooltip: (c: any) => c.usato ? "Già utilizzato" : "Rimuovi destinatario",
                    onClick: (c: any) => {
                      if (c.usato) return;
                      if (!confirm(`Rimuovere ${c.nome} dai destinatari?`)) return;
                      setTargetClients(prev => prev.filter(x => x.id !== c.id));
                    },
                    hidden: (c: any) => c.usato && !c.usage?.revoked,
                  } as RowAction<any>,
                ]}
                emptyText="Nessun cliente target"
                page={1}
                pageSize={targetClients.length || 1}
                total={targetClients.length}
                onPageChange={() => {}}
              />
              </div>
            ) : (
              <>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}><input style={{ ...stl, flex: 1 }} value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Cerca per codice cliente, ragione sociale o P.IVA..." onKeyDown={e => e.key === "Enter" && searchClients()} /><button className="btn btn-secondary btn-sm" onClick={searchClients}>Cerca</button></div>
            {searchResults.length > 0 && (<div style={{ maxHeight: 200, overflow: "auto", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 12 }}>{searchResults.map((c: any) => (<div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderBottom: "1px solid var(--border)", fontSize: 13, cursor: "pointer" }} onClick={() => toggleClient(c.id)}><input type="checkbox" checked={selectedIds.has(c.id)} readOnly style={{ accentColor: "var(--accent)", width: 16, height: 16, flexShrink: 0, margin: 0 }} /><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.ragioneSociale || c.nome}</span><span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>{c.cod || c.codiceCliente || ""}</span></div>))}</div>)}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 12 }}>
              <div><label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Regione</label><select style={stl} value={filtroRegione} onChange={e => setFiltroRegione(e.target.value)}><option value="">Tutte</option><option value="Lombardia">Lombardia</option><option value="Veneto">Veneto</option><option value="Toscana">Toscana</option><option value="Lazio">Lazio</option><option value="Emilia-R.">Emilia-R.</option><option value="Piemonte">Piemonte</option><option value="Campania">Campania</option><option value="Sicilia">Sicilia</option></select></div>
              <div><label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Ultimo ordine</label><select style={stl} value={filtroUltimo} onChange={e => setFiltroUltimo(e.target.value)}><option value="">Qualsiasi</option><option value="30">Ultimi 30 gg</option><option value="90">Ultimi 90 gg</option><option value="over90">Oltre 90 gg</option><option value="over180">Oltre 180 gg</option></select></div>
              <div><label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Sconto medio</label><select style={stl} value={filtroSconto} onChange={e => setFiltroSconto(e.target.value)}><option value="">Qualsiasi</option><option value="low">&lt;10%</option><option value="mid">10–25%</option><option value="high">&gt;25%</option></select></div>
              <div><label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Volume 12 mesi</label><select style={stl} value={filtroVolume} onChange={e => setFiltroVolume(e.target.value)}><option value="">Qualsiasi</option><option value="small">&lt;1k€</option><option value="low">&lt;5k€</option><option value="mid">5–20k€</option><option value="large">&gt;20k€</option></select></div>
            </div>
            {aiSuggestions.length > 0 && (<div style={{ padding: "12px 16px", background: "color-mix(in oklch, var(--blue) 8%, transparent)", border: "1px solid var(--blue)", borderRadius: 10, marginBottom: 12 }}><div style={{ fontSize: 13, fontWeight: 600, color: "var(--blue)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>{iconCal}Suggerimenti AI</div>{aiSuggestions.map((s: any, i: number) => (<div key={i} onClick={() => applyAISuggestion(s)} style={{ cursor: "pointer", padding: "8px 12px", borderRadius: 6, marginBottom: 4, background: "var(--surface)", fontSize: 13 }}><div style={{ fontWeight: 500 }}>{s.title}</div><div style={{ color: "var(--muted)", fontSize: 12 }}>{s.description} <strong>{s.count} clienti</strong></div></div>))}</div>)}
            {(segCount > 0 || selectedIds.size > 0) && (<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--fg-soft)", borderRadius: 8, fontSize: 13 }}><span>Clienti selezionati: <strong style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{segCount + selectedIds.size}</strong></span>{segCount > 0 && (<button className="btn btn-ghost btn-sm" onClick={() => setShowClientList(!showClientList)}>{showClientList ? "Nascondi ▲" : "Vedi elenco ▼"}</button>)}</div>)}
            {showClientList && segged.length > 0 && (<div style={{ maxHeight: 200, overflow: "auto", border: "1px solid var(--border)", borderRadius: 8, marginTop: 8 }}>{segged.map((c: any) => (<div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderBottom: "1px solid var(--border)", fontSize: 13 }}><input type="checkbox" checked readOnly style={{ accentColor: "var(--accent)" }} /><span style={{ flex: 1 }}>{c.nome}</span><span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>{c.cod}</span></div>))}</div>)}
              </>
            )}
          </div>
          <div className="modal-root-footer"><button className="btn btn-secondary" onClick={() => setStep("dati")}>← Dati coupon</button><button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? "Creazione…" : isEdit ? "Salva modifiche" : "Crea coupon"}</button></div>
        </>
      )}
    </Modal>
  );
}
