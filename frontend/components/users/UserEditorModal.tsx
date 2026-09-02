"use client";

import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "../../lib/api";
import type {
  CustomerProfile,
  CustomerIntelligenceProfile,
  CustomerDossier,
  CustomerInsight,
  IndirizzoCliente,
  ContattoCliente,
  OrdineCliente,
  OrdiniResponse,
} from "../../lib/types";
import Modal from "../common/Modal";
import Notice from "../common/Notice";
import SyncButton from "../common/SyncButton";
import Hint from "../common/Hint";
import Tooltip from "../common/Tooltip";
import { useConfirm } from "../common/ConfirmProvider";
import ProvisionalPasswordModal from "./ProvisionalPasswordModal";
import OrdineDetailModal from "./OrdineDetailModal";
import CustomerTimeline from "../admin/CustomerTimeline";
import CustomerDossierPanel from "../admin/CustomerDossier";
import CustomerOfferte from "../admin/CustomerOfferte";

export type UserEditorTarget =
  | { mode: "create" }
  | { mode: "edit"; user: CustomerProfile };

type Tab = "panoramica" | "offerte" | "anagrafica" | "ordini" | "attivita" | "profilo";

const SALUTE: Record<CustomerDossier["salute"], { txt: string; col: string }> = {
  buona: { txt: "buona", col: "var(--ok)" },
  media: { txt: "media", col: "var(--amber)" },
  a_rischio: { txt: "a rischio", col: "var(--danger)" },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function fmtDataIt(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("it-IT");
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="field-section">
      <h3 className="field-section-title">{title}</h3>
      <div className="field-grid">{children}</div>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: ReactNode }) {
  return (
    <div className={`field${full ? " field-col-2" : ""}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}









function RoField({ label, value, mono, full }: { label: string; value?: string | null; mono?: boolean; full?: boolean }) {
  return (
    <div className={`field${full ? " full" : ""}`}>
      <label>{label}</label>
      <div className={`ro locked${mono ? " mono" : ""}`}>{value ?? "—"}</div>
    </div>
  );
}

function Fsec({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="fsec">
      <div className="fsec-h">{title}</div>
      {children}
    </div>
  );
}

const STATO_CLS: Record<string, string> = {
  fatturato: "st-ok",
  fatturata: "st-ok",
  confermato: "st-blue",
  spedito: "st-amber",
  cancellato: "st-danger",
};

function StatoPill({ stato }: { stato: string | null }) {
  const s = stato?.toLowerCase() ?? "";
  const cls = Object.entries(STATO_CLS).find(([k]) => s.includes(k))?.[1] ?? "st-muted";
  return (
    <span className={`status ${cls}`}>
      <span className="sd">●</span>
      {stato || "—"}
    </span>
  );
}

function descrizioneOrdine(o: OrdineCliente): string {
  const n = o.righe.length;
  const prima = o.righe[0]?.descrizione?.trim() || o.righe[0]?.codiceProdotto;
  if (!prima) return n > 0 ? `${n} articoli` : "—";
  return `${prima} · ${n} articoli`;
}

function tipoIndirizzo(a: IndirizzoCliente): { label: string; cls: string } {
  const t = (a.tipoDestinazione ?? "").toLowerCase();
  if (a.flagSpedizione || t === "spedizione") return { label: "Spedizione", cls: "st-amber" };
  if (t === "fatturazione" || t === "legale") return { label: "Sede legale", cls: "st-blue" };
  if (t === "magazzino") return { label: "Magazzino", cls: "st-amber" };
  return { label: "Filiale", cls: "st-muted" };
}

function AddrCard({ tipo, cls, ragioneSociale, a }: { tipo: string; cls: string; ragioneSociale?: string | null; a: { indirizzo: string | null | undefined; cap: string | null | undefined; citta: string | null | undefined; provincia: string | null | undefined } }) {
  return (
    <div className="addr-card">
      <div className="addr-card-h">
        <span className={`status ${cls}`}><span className="sd">●</span>{tipo}</span>
        {ragioneSociale && <div className="addr-card-title">{ragioneSociale}</div>}
      </div>
      <div className="addr-l"><b>Indirizzo</b><span>{a.indirizzo || "—"}</span></div>
      <div className="addr-l"><b>CAP</b><span className="mono">{a.cap || "—"}</span></div>
      <div className="addr-l"><b>Città</b><span>{a.citta || "—"}</span></div>
      <div className="addr-l"><b>Provincia</b><span className="mono">{a.provincia || "—"}</span></div>
    </div>
  );
}

export default function UserEditorModal({
  target,
  onClose,
  onSaved,
}: {
  target: UserEditorTarget;
  onClose: () => void;
  onSaved: (prov: { email: string; password: string } | null) => void;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const tServer = useTranslations("server");
  const confirm = useConfirm();
  const editing = target.mode === "edit" ? target.user : null;

  const [form, setForm] = useState({
    email: editing?.email ?? "",
    nome: editing?.nome ?? "",
    ragioneSociale: editing?.ragioneSociale ?? "",
    partitaIva: editing?.partitaIva ?? "",
    telefono: editing?.telefono ?? "",
    preferredLanguage: editing?.preferredLanguage ?? "it",
  });
  const [tab, setTab] = useState<Tab>(editing ? "panoramica" : "anagrafica");
  const [dossier, setDossier] = useState<CustomerDossier | null>(null);
  const [insight, setInsight] = useState<CustomerInsight | null>(null);
  const [profilo, setProfilo] = useState<CustomerIntelligenceProfile | null>(null);
  const [profiloLoading, setProfiloLoading] = useState(false);
  const [indirizzi, setIndirizzi] = useState<IndirizzoCliente[]>([]);
  const [contatti, setContatti] = useState<ContattoCliente[]>([]);
  const [ordini, setOrdini] = useState<OrdineCliente[]>([]);
  const [totalOrdini, setTotalOrdini] = useState(0);
  const [ordiniPage, setOrdiniPage] = useState(1);
  const [ordiniSearch, setOrdiniSearch] = useState("");
  const [ordiniAnni, setOrdiniAnni] = useState<number[]>([]);
  const [ordiniYear, setOrdiniYear] = useState(String(new Date().getFullYear()));
  const [ordiniSortBy, setOrdiniSortBy] = useState("dataOrdine");
  const [ordiniSortDir, setOrdiniSortDir] = useState<"asc" | "desc">("desc");
  const [ordiniLoading, setOrdiniLoading] = useState(false);
  const [detailOrdine, setDetailOrdine] = useState<OrdineCliente | null>(null);
  const [linkedError, setLinkedError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busyAi, setBusyAi] = useState(false);
  const [busyBox, setBusyBox] = useState(false);
  const [provisional, setProvisional] = useState<{ email: string; password: string } | null>(null);
  const [initialForm] = useState(() => form);
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  const canSave =
    tab === "anagrafica" &&
    !busy &&
    isDirty &&
    (editing != null || (form.email.trim() !== "" && form.nome.trim() !== ""));

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onDelete() {
    if (!editing) return;
    if (!(await confirm({ message: t("confirmDelete"), tone: "danger" }))) return;
    setDeleting(true);
    setError(null);
    try {
      await api.del(`/api/customers/${editing.id}`);
      onSaved(null);
    } catch (err) {
      if (err instanceof ApiError && err.code === "users.ha_ordini_non_importati") {
        setDeleting(false);
        if (!(await confirm({ message: t("confirmBlockNonImportati"), tone: "danger" }))) return;
        setDeleting(true);
        try {
          await api.post(`/api/customers/${editing.id}/block`);
          onSaved(null);
        } catch (e2) {
          setError(e2 instanceof ApiError ? e2.code : "errors.generic");
          setDeleting(false);
        }
        return;
      }
      setError(err instanceof ApiError ? err.code : "errors.generic");
      setDeleting(false);
    }
  }

  async function handleCancel() {
    if (target.mode === "create" && isDirty && !(await confirm({ message: t("confirmDiscard"), tone: "danger" }))) return;
    onClose();
  }

  async function loadDossier() {
    if (!editing) return;
    try {
      const [d, i] = await Promise.all([
        api.get<CustomerDossier>(`/api/admin/customers/${editing.id}/dossier`),
        api.get<CustomerInsight | null>(`/api/customers/${editing.id}/insight`),
      ]);
      setDossier(d);
      setInsight(i);
    } catch {
      setDossier(null);
    }
  }

  async function loadOrdini(
    search?: string,
    page?: number,
    sortBy?: string,
    sortDir?: string,
    year?: string,
  ) {
    if (!editing) return;
    setOrdiniLoading(true);
    try {
      const params = new URLSearchParams();
      const s = search !== undefined ? search : ordiniSearch;
      const p = page !== undefined ? page : ordiniPage;
      const sb = sortBy !== undefined ? sortBy : ordiniSortBy;
      const sd = sortDir !== undefined ? sortDir : ordiniSortDir;
      const yr = year !== undefined ? year : ordiniYear;
      if (s) params.set("search", s);
      params.set("page", String(p));
      params.set("limit", "20");
      params.set("sortBy", sb);
      params.set("sortDir", sd);
      params.set("year", yr);
      const r = await api.get<OrdiniResponse>(`/api/customers/${editing.id}/ordini?${params}`);
      setOrdini(r.items);
      setTotalOrdini(r.total);
      setOrdiniAnni(r.years);
      if (r.years.length > 0 && !r.years.includes(Number(yr))) {
        setOrdiniYear(String(r.years[0]));
      }
      if (search !== undefined) setOrdiniSearch(search);
      if (page !== undefined) setOrdiniPage(page);
    } catch (err) {
      setLinkedError(err instanceof ApiError ? err.code : "errors.generic");
    } finally {
      setOrdiniLoading(false);
    }
  }

  async function loadProfilo() {
    if (!editing) return;
    setProfiloLoading(true);
    try {
      const res = await api.get<CustomerIntelligenceProfile>(`/api/admin/customers/${editing.id}/profilo`);
      setProfilo(res);
    } catch {
      setProfilo(null);
    } finally {
      setProfiloLoading(false);
    }
  }

  function handleSort(field: string) {
    const same = ordiniSortBy === field;
    const newDir = same && ordiniSortDir === "asc" ? "desc" : "asc";
    setOrdiniSortBy(field);
    setOrdiniSortDir(newDir);
    setOrdiniPage(1);
    void loadOrdini(undefined, 1, field, newDir);
  }

  useEffect(() => {
    if (!editing) return;
    const id = editing.id;
    void Promise.all([
      api.get<CustomerDossier>(`/api/admin/customers/${id}/dossier`),
      api.get<CustomerInsight | null>(`/api/customers/${id}/insight`),
    ])
      .then(([d, i]) => { setDossier(d); setInsight(i); })
      .catch(() => setDossier(null));
    void api
      .get<CustomerIntelligenceProfile>(`/api/admin/customers/${id}/profilo`)
      .then(setProfilo)
      .catch(() => setProfilo(null));
    if (tab === "anagrafica") {
      if (indirizzi.length === 0) {
        void api
          .get<IndirizzoCliente[]>(`/api/customers/${id}/indirizzi`)
          .then(setIndirizzi)
          .catch((err) => setLinkedError(err instanceof ApiError ? err.code : "errors.generic"));
      }
      if (contatti.length === 0) {
        void api
          .get<ContattoCliente[]>(`/api/customers/${id}/contatti`)
          .then(setContatti)
          .catch((err) => setLinkedError(err instanceof ApiError ? err.code : "errors.generic"));
      }
    }
    if (tab === "ordini") {
      const params = new URLSearchParams({
        page: "1",
        limit: "20",
        sortBy: "dataOrdine",
        sortDir: "desc",
        year: String(new Date().getFullYear()),
      });
      void api
        .get<OrdiniResponse>(`/api/customers/${id}/ordini?${params}`)
        .then((r) => {
          setOrdini(r.items);
          setTotalOrdini(r.total);
          setOrdiniAnni(r.years);
          if (r.years.length > 0 && !r.years.includes(Number(params.get("year")))) {
            setOrdiniYear(String(r.years[0]));
          }
        })
        .catch((err) => setLinkedError(err instanceof ApiError ? err.code : "errors.generic"));
    }
  }, [tab, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!editing) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editing, onClose]);

  async function elaboraAI() {
    if (!editing) return;
    setBusyAi(true);
    setError(null);
    try {
      await Promise.all([
        api.post<CustomerIntelligenceProfile>(`/api/admin/customers/${editing.id}/regenerate-profile`),
        api.post<CustomerInsight>(`/api/customers/${editing.id}/insight/genera`),
      ]);
      await Promise.all([loadDossier(), loadProfilo()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "errors.generic");
    } finally {
      setBusyAi(false);
    }
  }

  async function rigeneraBox() {
    if (!editing) return;
    if (!(await confirm({
      title: "Rigenera box",
      message: "Rigenerare i box dashboard di questo cliente?",
      confirmLabel: "Rigenera",
    }))) return;
    setBusyBox(true);
    try {
      await api.post(`/api/dashboard/suggerimenti/rigenera?clienteId=${editing.id}`);
    } catch {
      setError("errors.generic");
    } finally {
      setBusyBox(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      nome: form.nome,
      ragioneSociale: form.ragioneSociale || undefined,
      partitaIva: form.partitaIva || undefined,
      telefono: form.telefono || undefined,
      preferredLanguage: form.preferredLanguage,
    };
    try {
      const res = await api.post<{ customer: CustomerProfile; provisionalPassword: string }>("/api/customers", {
        email: form.email,
        ...payload,
      });
      onSaved({ email: res.customer.email, password: res.provisionalPassword });
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "errors.generic");
      setBusy(false);
    }
  }

  const s = dossier ? SALUTE[dossier.salute] : null;

  return (
    <>
      {editing ? (
        <div
          className="dossier-backdrop"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget && e.button === 0) onClose();
          }}
        >
        <div className="dossier">
          <header className="dossier-header">
            <div className="dossier-title">
              <h1>{editing.ragioneSociale || editing.nome || t("editTitle")}</h1>
              <div className="dossier-kv">
                <span>Codice <span className="mono">{editing.codiceCliente || "—"}</span></span>
                <span>Listino <span className="mono">{editing.codiceListino || "—"}</span></span>
                <span>{[editing.indirizzo, editing.cap, editing.citta, editing.provincia ? `(${editing.provincia})` : null].filter(Boolean).join(" · ") || "—"}</span>
                <span>P.IVA <span className="mono">{editing.partitaIva || "—"}</span></span>
              </div>
              <div className="badges">
                {dossier ? (
                  <>
                    <span className="pill solid" style={{ background: "var(--accent)" }}>{dossier.segmento}</span>
                    <Tooltip text="Indicatore stimato dallo storico ordini (cadenza d'acquisto, trend del fatturato e ultimo ordine). Buona = cliente regolare e attivo. Media = andamento altalenante o segnali misti. A rischio = cadenza o fatturato in calo.">
                      <span className="pill" style={{ cursor: "help" }}>
                        Salute <span className="sd" style={{ color: s!.col }}>●</span> {s!.txt}
                      </span>
                    </Tooltip>
                    {dossier.kpi.ultimoOrdine && (
                      <span className="pill muted">Ultimo ordine {dossier.kpi.giorniDaUltimoOrdine ?? "—"} gg fa</span>
                    )}
                  </>
                ) : (
                  <span className="pill muted">Caricamento…</span>
                )}
              </div>
            </div>
            <button className="modal-root-close" onClick={onClose} aria-label="Chiudi">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          <nav className="dossier-tabs" role="tablist" aria-label="Sezioni della scheda cliente">
            <button className={`tab-btn ${tab === "panoramica" ? "active" : ""}`} onClick={() => setTab("panoramica")} role="tab">Panoramica</button>
            <button className={`tab-btn ${tab === "offerte" ? "active" : ""}`} onClick={() => setTab("offerte")} role="tab">Offerte</button>
            <button className={`tab-btn ${tab === "anagrafica" ? "active" : ""}`} onClick={() => setTab("anagrafica")} role="tab">Anagrafica e contatti</button>
            <button className={`tab-btn ${tab === "ordini" ? "active" : ""}`} onClick={() => setTab("ordini")} role="tab">
              Ordini {dossier && <span className="cnt">{dossier.kpi.ordiniTotali}</span>}
            </button>
            <button className={`tab-btn ${tab === "attivita" ? "active" : ""}`} onClick={() => setTab("attivita")} role="tab">Attività</button>
            <button className={`tab-btn ${tab === "profilo" ? "active" : ""}`} onClick={() => setTab("profilo")} role="tab">Profilo</button>
            <span style={{ marginLeft: "auto", display: "flex", gap: 8, paddingLeft: 16, flexShrink: 0 }}>
              <button type="button" className="btn" onClick={rigeneraBox} disabled={busyBox}>
                {busyBox ? "Rigenero…" : "Rigenera box"}
              </button>
              <button type="button" className="btn" onClick={elaboraAI} disabled={busyAi}>
                {busyAi ? "Elaboro…" : "Elabora con AI"}
              </button>
            </span>
          </nav>

          {error && <div style={{ padding: "8px 24px 0" }}><Notice variant="error" onClose={() => setError(null)}>{tServer(error)}</Notice></div>}

          <div className="dossier-body">
            {tab === "panoramica" && <CustomerDossierPanel dossier={dossier} insight={insight} />}
            {tab === "offerte" && editing && <CustomerOfferte customerId={editing.id} />}

            {tab === "anagrafica" && (
              <div>
                <div className="panel-intro">
                  <strong>Anagrafica e contatti</strong>
                  <Hint text="Dati anagrafici e contatti del cliente. Tutti i campi provengono dal gestionale e sono in sola lettura: le modifiche si fanno sul gestionale e arrivano con la prossima sincronizzazione." />
                </div>

                <div className="fsec">
                  <div className="fsec-h">Anagrafica</div>
                  <RoField label="Codice cliente" value={editing.codiceCliente} mono />
                  <RoField label="Listino" value={editing.codiceListino} mono />
                  <RoField label="Ragione sociale" value={editing.ragioneSociale} />
                  <RoField label="P.IVA" value={editing.partitaIva} mono />
                  <RoField label="Email" value={editing.email} />
                  <RoField label="Telefono" value={editing.telefono} mono />
                  <RoField label="Lingua preferita" value={editing.preferredLanguage === "it" ? "Italiano" : "English"} />
                  <div className="fsec-h">Condizioni commerciali</div>
                  <RoField label="Pagamento" value={editing.codicePagamentoDescrizione || editing.codicePagamento} />
                  <RoField label="Fido" value={editing.fido != null ? `€ ${Number(editing.fido).toLocaleString("it-IT")}` : null} mono />
                </div>

                <div style={{ marginTop: 22 }}>
                  <div className="block-h" style={{ marginBottom: 0 }}>
                    <span className="block-t">Indirizzi e sedi</span>
                    <span className="mono">{indirizzi.length + 1}</span>
                    <span style={{ flex: 1 }} />
                    <Hint text="Sedi e recapiti del cliente registrati sul gestionale: sede legale, filiali, punto di spedizione e magazzino. In sola lettura, aggiornati a ogni sincronizzazione." />
                  </div>
                  <div className="addr-grid">
                    <AddrCard
                      tipo="Sede legale"
                      cls="st-blue"
                      ragioneSociale={editing.ragioneSociale}
                      a={{ indirizzo: editing.indirizzo, cap: editing.cap, citta: editing.citta, provincia: editing.provincia }}
                    />
                    {indirizzi.map((a) => {
                      const tp = tipoIndirizzo(a);
                      return <AddrCard key={a.id} tipo={tp.label} cls={tp.cls} ragioneSociale={a.ragioneSociale} a={a} />;
                    })}
                  </div>
                </div>

                <div style={{ marginTop: 22 }}>
                  <div className="block-h" style={{ marginBottom: 8 }}>
                    <span className="block-t">Contatti registrati</span>
                    <span className="mono">{contatti.length}</span>
                    <span style={{ flex: 1 }} />
                    <Hint text="Elenco dei contatti e riferimenti registrati sul gestionale: canale, data e contenuto. Solo dati di riferimento, non modificabili da qui." />
                  </div>
                  {contatti.length === 0 ? (
                    <p className="meta">Nessun contatto.</p>
                  ) : (
                    <div className="data-table">
                      <div className="data-table-scroll">
                        <table>
                          <thead>
                            <tr><th>Tipo</th><th>Data</th><th>Contenuto</th></tr>
                          </thead>
                          <tbody>
                            {contatti.map((c) => (
                              <tr key={c.id}>
                                <td>{c.tipo}</td>
                                <td className="mono">{fmtDataIt(c.data)}</td>
                                <td>{c.contenuto}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "ordini" && (
              <div className="ordini-tab">
                {linkedError && <div style={{ flexShrink: 0 }}><Notice variant="error" onClose={() => setLinkedError(null)}>{tServer(linkedError)}</Notice></div>}

                <div className="panel-intro">
                  <strong>Ordini e storico acquisti</strong>
                  <Hint text="Storico ordini sincronizzato dal gestionale. Cerca per numero o articolo, filtra per anno e apri un ordine per vedere i dettagli delle righe. «Sincronizza» aggiorna i dati dal gestionale." />
                </div>

                <div className="ord-tools">
                  <div className="search">
                    <span className="ic">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                    </span>
                    <input
                      type="text"
                      placeholder="Cerca per numero ordine, codice articolo, descrizione…"
                      value={ordiniSearch}
                      onChange={(e) => {
                        const v = e.target.value;
                        setOrdiniSearch(v);
                        setOrdiniPage(1);
                        void loadOrdini(v, 1);
                      }}
                    />
                  </div>
                  <select
                    className="select"
                    aria-label="Filtra per anno"
                    value={ordiniYear}
                    onChange={(e) => {
                      const y = e.target.value;
                      setOrdiniYear(y);
                      setOrdiniPage(1);
                      void loadOrdini(undefined, 1, undefined, undefined, y);
                    }}
                  >
                    {ordiniAnni.length === 0 ? (
                      <option value={String(new Date().getFullYear())}>{new Date().getFullYear()}</option>
                    ) : (
                      ordiniAnni.map((y) => (
                        <option key={y} value={String(y)}>{y}</option>
                      ))
                    )}
                  </select>
                  {editing.codiceCliente && (
                    <SyncButton
                      label="Sincronizza"
                      onClick={async () => {
                        setLinkedError(null);
                        try {
                          await api.post(`/api/integrazione/clienti/${editing.codiceCliente}/sync-ordini`);
                          await loadOrdini("", 1);
                        } catch (err) {
                          setLinkedError(err instanceof ApiError ? err.code : "errors.generic");
                          throw err;
                        }
                      }}
                    />
                  )}
                </div>

                {ordiniLoading && ordini.length === 0 ? (
                  <p className="meta">Caricamento…</p>
                ) : ordini.length === 0 ? (
                  <p className="meta">Nessun ordine.</p>
                ) : (
                  <div className="data-table">
                    <div className="data-table-scroll">
                      <table>
                        <colgroup>
                          <col style={{ width: 130 }} />
                          <col style={{ width: 120 }} />
                          <col style={{ width: 140 }} />
                          <col />
                          <col style={{ width: 120 }} />
                          <col style={{ width: 52 }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th className="sortable" onClick={() => handleSort("numeroOrdine")}>Ordine{ordiniSortBy === "numeroOrdine" && (ordiniSortDir === "asc" ? " ▲" : " ▼")}</th>
                            <th className="sortable" onClick={() => handleSort("dataOrdine")}>Data{ordiniSortBy === "dataOrdine" && (ordiniSortDir === "asc" ? " ▲" : " ▼")}</th>
                            <th className="sortable" onClick={() => handleSort("stato")}>Stato{ordiniSortBy === "stato" && (ordiniSortDir === "asc" ? " ▲" : " ▼")}</th>
                            <th>Descrizione</th>
                            <th className="sortable num" onClick={() => handleSort("importoTotale")}>Totale{ordiniSortBy === "importoTotale" && (ordiniSortDir === "asc" ? " ▲" : " ▼")}</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {ordini.map((o) => {
                            const hasImporto = o.righe.some((r) => r.prezzo != null && r.quantita != null);
                            const calcTotale = o.righe.reduce((s, r) => s + (Number(r.quantita) || 0) * (Number(r.prezzo) || 0), 0);
                            return (
                            <tr key={o.id}>
                              <td className="mono" style={{ fontWeight: 600 }}>#{o.numeroOrdine}</td>
                              <td className="mono" style={{ fontSize: 13 }}>{fmtDate(o.dataOrdine)}</td>
                              <td><StatoPill stato={o.stato} /></td>
                              <td style={{ fontSize: 12.5, color: "var(--muted)" }}>{descrizioneOrdine(o)}</td>
                              <td className="num mono">
                                {hasImporto ? `€ ${calcTotale.toFixed(2)}` : "—"}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="row-action"
                                  onClick={() => setDetailOrdine(o)}
                                  aria-label="Dettaglio ordine"
                                  title="Dettaglio"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3" /><path d="M21 12a9 9 0 1 0-9 9" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ); })}
                        </tbody>
                      </table>
                    </div>

                    <div className="data-footer">
                      <span>
                        {(totalOrdini === 0 ? 0 : (ordiniPage - 1) * 20 + 1)}–{Math.min(ordiniPage * 20, totalOrdini)} di {totalOrdini}
                      </span>
                      {totalOrdini > 20 && (
                        <div className="pager">
                          <button
                            type="button"
                            disabled={ordiniPage <= 1}
                            onClick={() => loadOrdini(undefined, ordiniPage - 1)}
                            aria-label="Pagina precedente"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                          </button>
                          <span className="pager-current">{ordiniPage} / {Math.ceil(totalOrdini / 20)}</span>
                          <button
                            type="button"
                            disabled={ordiniPage >= Math.ceil(totalOrdini / 20)}
                            onClick={() => loadOrdini(undefined, ordiniPage + 1)}
                            aria-label="Pagina successiva"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "attivita" && (
              <div>
                <div className="panel-intro">
                  <strong>Attività e comportamento</strong>
                  <Hint text="Cronologia dei comportamenti del cliente sul portale (accessi, ricerche, carrello, ordini). Ogni colore indica un tipo di evento." />
                </div>
                <CustomerTimeline customerId={editing.id} showAi={false} />
              </div>
            )}

            {tab === "profilo" && (
              <ProfiloTab
                profilo={profilo}
                loading={profiloLoading}
                onGenerate={async () => {
                  setProfiloLoading(true);
                  try {
                    const res = await api.post<CustomerIntelligenceProfile>(
                      `/api/admin/customers/${editing.id}/regenerate-profile`,
                    );
                    setProfilo(res);
                    await loadDossier();
                  } catch {
                    setProfilo(null);
                  } finally {
                    setProfiloLoading(false);
                  }
                }}
              />
            )}
          </div>
          <footer className="dossier-footer">
            <div className="footer-actions">
              <button type="button" className="btn btn-danger btn-sm" onClick={onDelete} disabled={deleting}>
                {deleting ? "Eliminazione..." : t("delete")}
              </button>
            </div>
            <div className="footer-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancel}>
                Chiudi
              </button>
            </div>
          </footer>
        </div>
        </div>
      ) : (
        <Modal
          open
          size="md"
          onClose={onClose}
          noHeader
          footer={
            <>
              <div style={{ flex: 1 }} />
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancel}>
                {tc("cancel")}
              </button>
              <button
                type="submit"
                form="user-editor-form"
                className="btn btn-primary btn-sm"
                disabled={!canSave}
              >
                {tc("save")}
              </button>
            </>
          }
        >
          <div className="modal-root-header">
            <h2>{t("createTitle")}</h2>
            <button className="modal-root-close" onClick={onClose} aria-label="Chiudi">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <form id="user-editor-form" onSubmit={onSubmit}>
            {error && <Notice variant="error" onClose={() => setError(null)}>{tServer(error)}</Notice>}
            <Section title={t("createTitle")}>
              <Field label={t("fieldEmail")} full>
                <input className="input" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
              <Field label={t("fieldName")}>
                <input className="input" required value={form.nome} onChange={(e) => set("nome", e.target.value)} />
              </Field>
              <Field label={t("fieldCompany")}>
                <input className="input" value={form.ragioneSociale} onChange={(e) => set("ragioneSociale", e.target.value)} />
              </Field>
              <Field label={t("fieldPiva")}>
                <input className="input" value={form.partitaIva} onChange={(e) => set("partitaIva", e.target.value)} />
              </Field>
              <Field label={t("fieldPhone")}>
                <input className="input" value={form.telefono} onChange={(e) => set("telefono", e.target.value)} />
              </Field>
              <Field label={t("fieldLanguage")}>
                <select className="input" value={form.preferredLanguage} onChange={(e) => set("preferredLanguage", e.target.value)}>
                  <option value="it">Italiano</option>
                  <option value="en">English</option>
                </select>
              </Field>
            </Section>
          </form>
        </Modal>
      )}
      {detailOrdine && (
        <OrdineDetailModal
          ordine={detailOrdine}
          customerName={editing ? editing.ragioneSociale || editing.nome : undefined}
          onClose={() => setDetailOrdine(null)}
        />
      )}
      {provisional && (
        <ProvisionalPasswordModal
          email={provisional.email}
          onClose={() => setProvisional(null)}
        />
      )}
    </>
  );
}

function ProfiloTab({
  profilo,
  loading,
  onGenerate,
}: {
  profilo: CustomerIntelligenceProfile | null;
  loading: boolean;
  onGenerate: () => void;
}) {
  if (loading) return <p className="meta">Generazione profilo in corso…</p>;
  if (!profilo) {
    return (
      <div className="catalog-empty">
        Nessun profilo generato.
        <button className="btn btn-primary btn-sm" onClick={onGenerate} style={{ marginLeft: 12 }}>
          Genera ora
        </button>
      </div>
    );
  }
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
  return (
    <div>
      <div className="panel-intro">
        <strong>Profilo del cliente</strong>
        <Hint text="Analisi del profilo generata dall'AI combinando dati ufficiali (registro imprese), storico ordini e comportamento sul portale: chi è il cliente, cosa gli interessa e cosa proporgli. Rigenerabile quando servono dati aggiornati." />
      </div>

      <div className="ai-box">
        <div className="ai-body">{profilo.sintesi ?? profilo.sintesiBreve ?? "—"}</div>
        <div className="ai-meta">Generato il {fmt(profilo.generatoIl)} · aggiornato il {fmt(profilo.aggiornatoIl)}</div>
      </div>

      <div className="grid-2-charts" style={{ marginTop: 14 }}>
        <div className="block">
          <div className="block-h"><span className="block-t">Settore</span></div>
          <span style={{ fontSize: 13.5 }}>{profilo.settore ?? "—"}</span>
        </div>
        <div className="block">
          <div className="block-h"><span className="block-t">Dimensione</span></div>
          <span style={{ fontSize: 13.5 }}>{profilo.dimensione ?? "—"}</span>
        </div>
        <div className="block">
          <div className="block-h"><span className="block-t">Fatturato stimato</span></div>
          <span style={{ fontSize: 13.5 }}>{profilo.fatturatoStimato ?? "—"}</span>
        </div>
        <div className="block">
          <div className="block-h"><span className="block-t">Stagionalità</span></div>
          <span style={{ fontSize: 13.5 }}>{profilo.stagionalita ?? "—"}</span>
        </div>
      </div>

      {profilo.composizioneBusiness && (
        <div className="block" style={{ marginTop: 14 }}>
          <div className="block-h">
            <span className="block-t">Composizione business</span>
            <span style={{ flex: 1 }} />
            <Hint text="Come si colloca il cliente nella filiera: cosa produce o rivende e in quale fase." />
          </div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>{profilo.composizioneBusiness}</p>
        </div>
      )}

      {profilo.sedi && profilo.sedi.length > 0 && (
        <div className="block" style={{ marginTop: 14 }}>
          <div className="block-h">
            <span className="block-t">Sedi</span>
            <span style={{ flex: 1 }} />
            <Hint text="Sedi rilevate tra dati ufficiali e indirizzi presenti sul gestionale." />
          </div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>{profilo.sedi.join(" · ")}</p>
        </div>
      )}

      {profilo.contattiChiave && profilo.contattiChiave.length > 0 && (
        <div className="block" style={{ marginTop: 14 }}>
          <div className="block-h">
            <span className="block-t">Contatti chiave</span>
            <span style={{ flex: 1 }} />
            <Hint text="Figure di riferimento del cliente con cui parlano i commerciali." />
          </div>
          <div className="data-table">
            <div className="data-table-scroll">
              <table>
                <thead>
                  <tr><th>Nome</th><th>Ruolo</th></tr>
                </thead>
                <tbody>
                  {profilo.contattiChiave.map((c, i) => (
                    <tr key={i}>
                      <td>{c.nome}</td>
                      <td>{c.ruolo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {profilo.interessiPrincipali && profilo.interessiPrincipali.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="block-h" style={{ marginBottom: 8 }}><span className="block-t">Interessi principali</span></div>
          <div className="tag-row">
            {profilo.interessiPrincipali.map((i, idx) => <span key={idx} className="tag">{i}</span>)}
          </div>
        </div>
      )}
      {profilo.interessiSecondari && profilo.interessiSecondari.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="block-h" style={{ marginBottom: 8 }}><span className="block-t">Interessi secondari</span></div>
          <div className="tag-row">
            {profilo.interessiSecondari.map((i, idx) => <span key={idx} className="tag">{i}</span>)}
          </div>
        </div>
      )}
      {profilo.nonCompreraMai && profilo.nonCompreraMai.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="block-h" style={{ marginBottom: 8 }}><span className="block-t">Non comprerà mai</span></div>
          <div className="tag-row">
            {profilo.nonCompreraMai.map((i, idx) => <span key={idx} className="tag danger">{i}</span>)}
          </div>
        </div>
      )}
      {profilo.opportunitaCrossSell && profilo.opportunitaCrossSell.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="block-h" style={{ marginBottom: 8 }}><span className="block-t">Opportunità cross-sell</span></div>
          <div className="tag-row">
            {profilo.opportunitaCrossSell.map((i, idx) => <span key={idx} className="tag">{i}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
