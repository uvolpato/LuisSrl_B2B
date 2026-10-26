"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../../../lib/api";
import Notice from "../../common/Notice";
import { useConfirm } from "../../common/ConfirmProvider";

interface Catalogo { id: number; nome: string; copertina: string | null; archiviato: boolean; dimensione: number | null; createdAt: string }
interface MailingRiga { id: number; nome: string; stato: string; canale: string; createdAt: string; nCataloghi: number; generati: number; aperti: number; scaricati: number }
interface Destinatario { id: number; email: string; nome: string | null; link: string; revocato: boolean; apertoIl: string | null; scaricati: number[] }
interface MailingDettaglio { id: number; nome: string; stato: string; canale: string; createdAt: string; cataloghi: { id: number; nome: string }[]; stats: { destinatari: number; aperture: number; click: number }; destinatari: Destinatario[] }
interface Cliente { id: number; email: string; nome: string; ragioneSociale: string | null; stato: string }

const fmtData = (s: string) => new Date(s).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
const fmtOra = (s: string | null) => (s ? new Date(s).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");
const fmtSize = (b: number | null) => (b == null ? "—" : `${(b / (1024 * 1024)).toLocaleString("it-IT", { maximumFractionDigits: 1 })} MB`);

const Icon = ({ d }: { d: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const iPlus = <Icon d={<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>} />;
const iX = <Icon d={<path d="M6 6l12 12M18 6L6 18" />} />;
const iChevronLeft = <Icon d={<path d="M15 6l-6 6 6 6" />} />;
const iChevronDown = <Icon d={<path d="M6 9l6 6 6-6" />} />;
const iDownload = <Icon d={<path d="M12 4v11M7 10l5 5 5-5M5 20h14" />} />;
const iSearch = <Icon d={<><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.2-4.2" /></>} />;
const iFile = <Icon d={<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" /><path d="M14 3v5h5" /></>} />;
const iUpload = <Icon d={<path d="M12 20V9M7 14l5-5 5 5M5 4h14" />} />;
const iBook = <Icon d={<><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>} />;
const iClienti = <Icon d={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>} />;

export default function CataloghiSection() {
  const confirm = useConfirm();
  const [cataloghi, setCataloghi] = useState<Catalogo[]>([]);
  const [mailing, setMailing] = useState<MailingRiga[]>([]);
  const [view, setView] = useState<"elenco" | "nuova" | "dettaglio">("elenco");
  const [dettaglio, setDettaglio] = useState<MailingDettaglio | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [esito, setEsito] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const carica = useCallback(async () => {
    setLoading(true);
    try {
      const [c, m] = await Promise.all([
        api.get<Catalogo[]>("/api/admin/cataloghi"),
        api.get<MailingRiga[]>("/api/admin/cataloghi/mailing"),
      ]);
      setCataloghi(c);
      setMailing(m);
      setErrore(null);
    } catch (e) {
      setErrore(e instanceof ApiError ? e.code : "errors.generic");
    }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- stesso schema di AdminOrdiniSection (fetch al mount)
  useEffect(() => { void carica(); }, [carica]);

  async function apriDettaglio(id: number) {
    try {
      setDettaglio(await api.get<MailingDettaglio>(`/api/admin/cataloghi/mailing/${id}`));
      setView("dettaglio");
    } catch (e) { setErrore(e instanceof ApiError ? e.code : "errors.generic"); }
  }

  async function revoca(id: number) {
    const ok = await confirm({ title: "Revocare il link?", tone: "danger", confirmLabel: "Revoca", message: <p style={{ fontSize: 13 }}>Il destinatario non potrà più scaricare il catalogo. Azione irreversibile.</p> });
    if (!ok) return;
    try {
      await api.post(`/api/admin/cataloghi/link/${id}/revoca`);
      if (dettaglio) await apriDettaglio(dettaglio.id);
      await carica();
    } catch (e) { setErrore(e instanceof ApiError ? e.code : "errors.generic"); }
  }

  async function inviaABrevo(id: number) {
    const ok = await confirm({ title: "Inviare i contatti a Brevo?", confirmLabel: "Invia", message: <p style={{ fontSize: 13 }}>I destinatari saranno importati su Brevo con l&apos;attributo CATALOGO_LINK.</p> });
    if (!ok) return;
    try {
      const r = await api.post<{ inviati: number; soloLink?: boolean }>(`/api/admin/cataloghi/mailing/${id}/brevo`);
      setEsito(r.soloLink ? "Campagna solo-link: nessun invio a Brevo." : `Inviati ${r.inviati} contatti a Brevo.`);
      await carica();
      await apriDettaglio(id);
    } catch (e) { setErrore(e instanceof ApiError ? e.code : "errors.generic"); }
  }

  return (
    <div className="cat" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <header className="admin-top">
        <div className="top-title">
          <h1>Cataloghi</h1>
          <div className="top-sub">Marketing · {mailing.length} campagne</div>
        </div>
        {view === "elenco" && (
          <div className="top-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setView("nuova")}>{iPlus}Nuova campagna</button>
          </div>
        )}
        {view === "nuova" && (
          <div className="top-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setView("elenco")}>{iX}Annulla</button>
          </div>
        )}
        {view === "dettaglio" && dettaglio && (
          <div className="top-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setView("elenco")}>{iChevronLeft}Cataloghi</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.open(`/api/admin/cataloghi/mailing/${dettaglio.id}/export`, "_blank")}>{iDownload}Esporta CSV</button>
          </div>
        )}
      </header>

      {errore && <div style={{ padding: "8px 32px 0" }}><Notice variant="error" onClose={() => setErrore(null)}>Errore: {errore}</Notice></div>}
      {esito && <div style={{ padding: "8px 32px 0" }}><Notice variant="success" onClose={() => setEsito(null)}>{esito}</Notice></div>}

      <div className="screens">
        {view === "elenco" && <ElencoScreen mailing={mailing} loading={loading} onDettaglio={apriDettaglio} onNuova={() => setView("nuova")} />}
        {view === "nuova" && <WizardScreen cataloghi={cataloghi} onCarica={carica} onDone={(id) => { void carica(); void apriDettaglio(id); }} />}
        {view === "dettaglio" && dettaglio && <DettaglioScreen d={dettaglio} onRevoca={revoca} onBrevo={inviaABrevo} onEsito={setEsito} onCarica={carica} onRefresh={apriDettaglio} />}
      </div>
    </div>
  );
}

/* ────────────────────────────── Elenco ────────────────────────────── */

function ElencoScreen({ mailing, loading, onDettaglio, onNuova }: { mailing: MailingRiga[]; loading: boolean; onDettaglio: (id: number) => void; onNuova: () => void }) {
  return (
    <section className="screen">
      <div className="content-scroll">
        {loading && (
          <div className="data-table" aria-busy="true">
            <div className="skeleton">
              {[0, 1, 2, 3].map((i) => <div className="skeleton-row" key={i}><span className="sk sk-name" /><span className="sk sk-pill" /><span className="sk sk-num" /><span className="sk sk-num" /><span className="sk sk-num" /><span className="sk sk-action" /></div>)}
            </div>
          </div>
        )}
        {!loading && mailing.length === 0 && (
          <div className="data-table">
            <div className="state">
              {iBook}
              <strong>Nessuna campagna</strong>
              <p>Quando invii un catalogo ai clienti lo ritrovi qui, con aperture e click.</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={onNuova}>{iPlus}Crea la prima campagna</button>
            </div>
          </div>
        )}
        {!loading && mailing.length > 0 && (
          <div className="data-table t-campagne">
            <div className="data-table-scroll">
              <table>
                <thead><tr>
                  <th className="c-nome">Campagna</th><th>Cataloghi</th><th className="num">Inviate</th><th className="num">Aperture</th><th className="num">Click</th><th>Stato</th><th className="col-actions">&nbsp;</th>
                </tr></thead>
                <tbody>
                  {mailing.map((m) => (
                    <tr key={m.id}>
                      <td className="c-nome">
                        <button type="button" className="name-btn" onClick={() => onDettaglio(m.id)}>{m.nome}</button>
                        <div className="cell-entity-sub">{fmtData(m.createdAt)} · {m.canale === "link" ? "Solo link" : "Email"}</div>
                      </td>
                      <td className="c-cat">{m.nCataloghi === 1 ? "1 catalogo" : `${m.nCataloghi} cataloghi`}</td>
                      <td className="c-inv num">{m.generati}</td>
                      <td className="c-app num">{m.aperti}</td>
                      <td className="c-sca num">{m.scaricati}</td>
                      <td className="c-stato"><span className={`pill ${m.stato === "inviata" ? "pv-ok" : "pv-amber"}`}>{m.stato === "inviata" ? "Inviata" : "Bozza"}</span></td>
                      <td className="col-actions c-azioni"><button type="button" className="btn btn-secondary btn-xs" onClick={() => onDettaglio(m.id)}>Apri</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="data-table-footer"><span>{mailing.length} campagne</span></div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ────────────────────────────── Wizard ────────────────────────────── */

const STEP = ["Cataloghi", "Destinatari", "Conferma"] as const;

function WizardScreen({ cataloghi, onCarica, onDone }: { cataloghi: Catalogo[]; onCarica: () => Promise<void>; onDone: (id: number) => void }) {
  const [step, setStep] = useState(0);

  const [nomeCatalogo, setNomeCatalogo] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadando, setUploadando] = useState(false);
  const [catalogoSel, setCatalogoSel] = useState<number[]>([]);

  const [fonte, setFonte] = useState<"file" | "clienti">("file");
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [clientiSel, setClientiSel] = useState<number[]>([]);

  const [nomeCampagna, setNomeCampagna] = useState("");
  const [canale, setCanale] = useState<"email" | "link">("email");
  const [creando, setCreando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function caricaCatalogo() {
    if (!pdfFile || !nomeCatalogo.trim()) return;
    setUploadando(true);
    setErrore(null);
    const fd = new FormData();
    fd.append("file", pdfFile);
    fd.append("nome", nomeCatalogo.trim());
    try {
      const c = await api.post<{ id: number }>("/api/admin/cataloghi", fd);
      setNomeCatalogo("");
      setPdfFile(null);
      setCatalogoSel((p) => [...p, c.id]);
      await onCarica();
    } catch (e) { setErrore(e instanceof ApiError ? e.code : "errors.generic"); }
    setUploadando(false);
  }

  async function archivia(id: number) { try { await api.post(`/api/admin/cataloghi/${id}/archivia`); await onCarica(); } catch { setErrore("Operazione non riuscita"); } }
  async function ripristina(id: number) { try { await api.post(`/api/admin/cataloghi/${id}/ripristina`); await onCarica(); } catch { setErrore("Operazione non riuscita"); } }

  async function crea() {
    if (catalogoSel.length === 0) { setErrore("Seleziona almeno un catalogo"); return; }
    if (fonte === "file" && !xlsxFile) { setErrore("Carica il file dei contatti"); return; }
    if (fonte === "clienti" && clientiSel.length === 0) { setErrore("Seleziona almeno un cliente"); return; }
    if (!nomeCampagna.trim()) { setErrore("Indica il nome della campagna"); return; }
    setCreando(true);
    setErrore(null);
    try {
      const m = await api.post<{ id: number }>("/api/admin/cataloghi/mailing", { nome: nomeCampagna.trim(), cataloghi: catalogoSel, canale });
      if (fonte === "file" && xlsxFile) {
        const fd = new FormData();
        fd.append("file", xlsxFile);
        await api.post(`/api/admin/cataloghi/mailing/${m.id}/import`, fd);
      } else if (fonte === "clienti") {
        await api.post(`/api/admin/cataloghi/mailing/${m.id}/import-clienti`, { customerIds: clientiSel });
      }
      onDone(m.id);
    } catch (e) { setErrore(e instanceof ApiError ? e.code : "errors.generic"); }
    setCreando(false);
  }

  const attivi = cataloghi.filter((c) => !c.archiviato);
  const archiviati = cataloghi.filter((c) => c.archiviato);
  const puoAvanti = step === 0 ? catalogoSel.length > 0 : step === 1 ? (fonte === "file" ? !!xlsxFile : clientiSel.length > 0) : false;

  return (
    <section className="screen">
      <div className="content-scroll">
        <div className="wizard">
          <ol className="stepper">
            {STEP.map((s, i) => (
              <li key={s}>
                <button type="button" className={`step-btn ${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`} disabled={i > step} onClick={() => i < step && setStep(i)}>
                  <span className="step-num">{i < step ? "✓" : i + 1}</span><span className="step-label">{s}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className="wizard-body">
            {errore && <Notice variant="error" onClose={() => setErrore(null)}>{errore}</Notice>}

            {step === 0 && (
              <div className="wiz-step">
                <h2 className="wizard-q">Quali cataloghi vuoi inviare?</h2>
                <div className="inline-upload">
                  <input className="input" type="text" placeholder="Nome del nuovo catalogo" value={nomeCatalogo} onChange={(e) => setNomeCatalogo(e.target.value)} />
                  <label className="file-chip" style={{ cursor: "pointer" }}>
                    {iUpload}<span>{pdfFile ? pdfFile.name : "Carica PDF"}</span>
                    <input type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
                  </label>
                  {pdfFile && <button type="button" className="file-clear" aria-label="Rimuovi il file" onClick={() => setPdfFile(null)}>{iX}</button>}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={caricaCatalogo} disabled={!pdfFile || !nomeCatalogo.trim() || uploadando}>{uploadando ? "…" : "Aggiungi"}</button>
                </div>
                <div className="check-list">
                  {attivi.length === 0 && <p className="wiz-hint">Nessun catalogo caricato: aggiungi il primo PDF qui sopra.</p>}
                  {attivi.map((c) => (
                    <div className="cat-row" key={c.id}>
                      <label className="check-item">
                        <input type="checkbox" checked={catalogoSel.includes(c.id)} onChange={() => setCatalogoSel((p) => p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id])} />
                        <span className="check-icon">{iFile}</span>
                        <span className="check-text"><strong>{c.nome}</strong><span>PDF · {fmtSize(c.dimensione)} · {fmtData(c.createdAt)}</span></span>
                        <span className="check-tag">Selezionato</span>
                      </label>
                      <button type="button" className="btn btn-secondary btn-xs cat-action" onClick={() => archivia(c.id)}>Archivia</button>
                    </div>
                  ))}
                </div>
                {archiviati.length > 0 && (
                  <details className="archive">
                    <summary>{iChevronDown}Archivio cataloghi ({archiviati.length})</summary>
                    <div className="archive-list">
                      {archiviati.map((c) => (
                        <div className="cat-row is-archived" key={c.id}>
                          <div className="check-item is-static"><span className="check-icon">{iFile}</span><span className="check-text"><strong>{c.nome}</strong><span>PDF · {fmtSize(c.dimensione)}</span></span></div>
                          <button type="button" className="btn btn-secondary btn-xs cat-action" onClick={() => ripristina(c.id)}>Ripristina</button>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="wiz-step">
                <h2 className="wizard-q">Da dove prendi i destinatari?</h2>
                <div className="source-grid" role="radiogroup" aria-label="Origine dei destinatari">
                  <button type="button" className={`source-card ${fonte === "file" ? "is-on" : ""}`} role="radio" aria-checked={fonte === "file"} onClick={() => setFonte("file")}>
                    <span className="source-icon">{iFile}</span>
                    <span className="source-text"><strong>Da Excel</strong><span>File .xlsx o .csv dei contatti</span></span>
                  </button>
                  <button type="button" className={`source-card ${fonte === "clienti" ? "is-on" : ""}`} role="radio" aria-checked={fonte === "clienti"} onClick={() => setFonte("clienti")}>
                    <span className="source-icon">{iClienti}</span>
                    <span className="source-text"><strong>Clienti B2B</strong><span>Sottoinsieme dei clienti</span></span>
                  </button>
                </div>

                {fonte === "file" && (
                  <div className="excel-panel">
                    <label className={`dropzone ${xlsxFile ? "is-set" : ""}`} style={{ cursor: "pointer" }}>
                      {iUpload}
                      <span className="dropzone-title">{xlsxFile ? xlsxFile.name : "Scegli il file Excel dei contatti"}</span>
                      <span className="dropzone-hint">.xlsx o .csv · colonne email, nome</span>
                      <input type="file" accept=".xlsx,.csv" style={{ display: "none" }} onChange={(e) => setXlsxFile(e.target.files?.[0] ?? null)} />
                    </label>
                  </div>
                )}
                {fonte === "clienti" && <SelettoreClienti sel={clientiSel} onSelChange={setClientiSel} onError={setErrore} />}
              </div>
            )}

            {step === 2 && (
              <div className="wiz-step">
                <h2 className="wizard-q">Controlla e crea la campagna</h2>
                <div className="field">
                  <span>Nome campagna</span>
                  <input className="input" type="text" placeholder="Campagna 25 ottobre 2026" value={nomeCampagna} onChange={(e) => setNomeCampagna(e.target.value)} />
                </div>
                <div className="summary">
                  <div className="summary-row"><span>Cataloghi</span><strong>{catalogoSel.length}</strong></div>
                  <div className="summary-row"><span>Destinatari</span><strong>{fonte === "file" ? (xlsxFile ? xlsxFile.name : "—") : `${clientiSel.length} clienti`}</strong></div>
                  <div className="summary-row"><span>Canale</span><strong>{canale === "email" ? "Email" : "Solo link"}</strong></div>
                </div>
                <div className="segmented">
                  <button type="button" className={canale === "email" ? "is-on" : ""} onClick={() => setCanale("email")}>Invia via email</button>
                  <button type="button" className={canale === "link" ? "is-on" : ""} onClick={() => setCanale("link")}>Genera solo link</button>
                </div>
                <p className="wiz-hint">Nessuna email parte finché non confermi. Puoi revocare l&apos;accesso ai singoli destinatari in qualsiasi momento.</p>
              </div>
            )}
          </div>

          <div className="wizard-foot">
            <button type="button" className="btn btn-secondary btn-sm" style={{ visibility: step === 0 ? "hidden" : "visible" }} onClick={() => setStep(step - 1)}>{iChevronLeft}Indietro</button>
            <div className="wizard-foot-right">
              {step < 2 ? (
                <button type="button" className="btn btn-primary btn-sm" disabled={!puoAvanti} onClick={() => setStep(step + 1)}>Continua</button>
              ) : (
                <button type="button" className="btn btn-primary btn-sm" disabled={creando} onClick={crea}>{creando ? "Creazione…" : "Crea campagna"}</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────── Selettore clienti ────────────────────── */

function SelettoreClienti({ sel, onSelChange, onError }: { sel: number[]; onSelChange: (s: number[]) => void; onError: (e: string | null) => void }) {
  const [cerca, setCerca] = useState("");
  const [q, setQ] = useState("");
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setQ(cerca.trim()), 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [cerca]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch al cambio filtro
    setLoading(true);
    const p = new URLSearchParams({ pageSize: "100", stato: "ATTIVO" });
    if (q) p.set("q", q);
    api.get<{ items: Cliente[]; total: number }>(`/api/customers?${p}`)
      .then((r) => { if (!cancelled) { setClienti(r.items); onError(null); } })
      .catch((e) => { if (!cancelled) onError(e instanceof ApiError ? e.code : "errors.generic"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const tutti = clienti.length > 0 && clienti.every((c) => sel.includes(c.id));

  return (
    <div className="import-body">
      <div className="client-tools">
        <div className="search">{iSearch}<input type="search" placeholder="Cerca per nome o email" value={cerca} onChange={(e) => setCerca(e.target.value)} /></div>
        <label className="check-all"><input type="checkbox" checked={tutti} onChange={() => onSelChange(tutti ? [] : clienti.map((c) => c.id))} />Seleziona tutti ({sel.length})</label>
      </div>
      <div className="client-list">
        {loading && <p className="wiz-hint">Caricamento…</p>}
        {!loading && clienti.length === 0 && <p className="client-empty">Nessun cliente trovato.</p>}
        {!loading && clienti.map((c) => (
          <label className="client-row" key={c.id}>
            <input type="checkbox" checked={sel.includes(c.id)} onChange={() => onSelChange(sel.includes(c.id) ? sel.filter((x) => x !== c.id) : [...sel, c.id])} />
            <span className="client-name">{c.ragioneSociale ?? c.nome}</span>
            <span className="client-mail">{c.email}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────── Dettaglio ────────────────────────────── */

function DettaglioScreen({ d, onRevoca, onBrevo, onEsito, onCarica, onRefresh }: {
  d: MailingDettaglio;
  onRevoca: (id: number) => void;
  onBrevo: (id: number) => void;
  onEsito: (s: string) => void;
  onCarica: () => Promise<void>;
  onRefresh: (id: number) => void;
}) {
  const importRef = useRef<HTMLInputElement>(null);

  function scaricaCsv(csv: string, nome: string) {
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nome; a.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await api.post<{ creati: number; csv: string }>(`/api/admin/cataloghi/mailing/${d.id}/import`, fd);
      onEsito(`Importati ${r.creati} contatti.`);
      scaricaCsv(r.csv, `catalogo-brevo-${d.id}.csv`);
      await onRefresh(d.id);
      await onCarica();
    } catch { onEsito("Import non riuscito"); }
  }

  const pct = (n: number) => (d.stats.destinatari ? `${Math.round((n / d.stats.destinatari) * 100)}% del totale` : "—");

  return (
    <section className="screen" data-screen="dettaglio">
      <div className="content-scroll">
        <div className="detail-bar">
          <span className={`pill ${d.stato === "inviata" ? "pv-ok" : "pv-amber"}`}>{d.stato === "inviata" ? "Inviata" : "Bozza"}</span>
          <p className="detail-meta">Creata il {fmtData(d.createdAt)} · {d.canale === "link" ? "Solo link" : "Email"} · {d.cataloghi.length === 1 ? "1 catalogo" : `${d.cataloghi.length} cataloghi`}</p>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {d.canale !== "link" && <button type="button" className="btn btn-secondary btn-sm" onClick={() => onBrevo(d.id)}>Invia a Brevo</button>}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => importRef.current?.click()}>{iUpload}Aggiungi da file</button>
          </div>
          <input ref={importRef} type="file" accept=".xlsx,.csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ""; }} />
        </div>
        <div className="stat-strip">
          <div className="stat"><div className="label">Destinatari</div><div className="value">{d.stats.destinatari}</div><div className="sub">email inviate</div></div>
          <div className="stat"><div className="label">Aperture</div><div className="value">{d.stats.aperture}</div><div className="sub">{pct(d.stats.aperture)}</div></div>
          <div className="stat"><div className="label">Click</div><div className="value">{d.stats.click}</div><div className="sub">{pct(d.stats.click)}</div></div>
        </div>
        <div className="data-table t-dest">
          <div className="data-table-scroll">
            <table>
              <thead><tr><th className="d-nome">Destinatario</th><th className="d-ape">Aperto il</th><th className="num">Click</th><th className="col-actions">Azioni</th></tr></thead>
              <tbody>
                {d.destinatari.map((r) => (
                  <tr key={r.id} className={r.revocato ? "is-revocato" : undefined}>
                    <td className="d-nome">
                      <div className="name-line"><strong>{r.nome ?? "—"}</strong>{r.revocato && <span className="pill pv-neutral revoked-pill">Revocato</span>}</div>
                      <div className="cell-entity-sub d-mail">{r.email}</div>
                    </td>
                    <td className="d-ape mono">{fmtOra(r.apertoIl)}</td>
                    <td className="num">{r.scaricati.length > 0 ? r.scaricati.length : "—"}</td>
                    <td className="col-actions d-az">
                      <button type="button" className="btn btn-secondary btn-xs" onClick={() => { navigator.clipboard.writeText(r.link); onEsito("Link copiato."); }}>Link</button>
                      {!r.revocato && <button type="button" className="btn btn-secondary danger btn-xs" onClick={() => onRevoca(r.id)}>Revoca</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="data-table-footer"><span>{d.destinatari.length} destinatari · {d.stats.aperture} hanno aperto</span></div>
        </div>
      </div>
    </section>
  );
}
