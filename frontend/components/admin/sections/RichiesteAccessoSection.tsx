"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminTopBar from "../AdminTopBar";
import DataTable from "../DataTable";
import type { Column, RowAction } from "../DataTable";
import { api, ApiError } from "../../../lib/api";
import Notice from "../../common/Notice";
import FocusTrap from "../../common/FocusTrap";
import { useConfirm } from "../../common/ConfirmProvider";

/* Sezione admin "Richieste accesso" (prototipo admin-richieste-accesso.html, specifica-admin-richieste-accesso.md). */

type Stato = "NUOVO" | "IN_VALUTAZIONE" | "APPROVATO" | "SCARTATO";
type Verdetto = "BUONO" | "VERIFICARE" | "SCARTARE";
type Azione = "approva" | "verifica" | "scarta";

interface Riga {
  id: number;
  ragioneSociale: string;
  partitaIva: string;
  citta: string | null;
  tipoAttivita: string | null;
  createdAt: string;
  verdetto: Verdetto | null;
  stato: Stato;
  anonimizzato: boolean;
  giorniAttesa: number | null;
}
interface Kpi { daDecidere: number; inVerifica: number; approvate30: number; scartate30: number; ferme: number }
interface Pagina { items: Riga[]; total: number; page: number; pages: number; kpi: Kpi }
interface Segnale { chiave: string; etichetta: string; stato: string; nota: string; fonti: string[] }
interface Report { segnali: Segnale[]; verdetto: Verdetto; motivazione: string; checklist: string[]; sintesi: string | null; durataMs: number; errore?: string }
interface Dettaglio extends Riga {
  codiceFiscale: string | null;
  referente: string;
  email: string;
  telefono: string | null;
  messaggio: string | null;
  lingua: string;
  privacyAccettataIl: string;
  privacyVersione: string;
  ip: string | null;
  report: Report | null;
  sedeIndirizzo: string | null;
  sedeCap: string | null;
  sedeCitta: string | null;
  sedeProvincia: string | null;
  sedeFonte: string | null;
  decisioneIl: string | null;
  esportatoFile: string | null;
  anonimizzatoIl: string | null;
  cliente: { id: number; codiceCliente: string | null; datiFatturazioneConfermatiIl: string | null } | null;
  eventi: { id: number; tipo: string; createdAt: string; dettagli: Record<string, unknown> | null }[];
}

const TIPI: Record<string, string> = { garden: "Garden center", vivaio: "Vivaio", fiorista: "Fiorista", architetto: "Architetto / paesaggista", altro: "Altro" };
const STATO_PILL: Record<Stato, [string, string]> = {
  NUOVO: ["st-blue", "Nuova"],
  IN_VALUTAZIONE: ["st-amber", "In verifica"],
  APPROVATO: ["st-ok", "Approvata"],
  SCARTATO: ["", "Scartata"],
};
const VERDETTO_PILL: Record<Verdetto, [string, string]> = { BUONO: ["st-ok", "Buono"], VERIFICARE: ["st-amber", "Verificare"], SCARTARE: ["st-red", "Scartare"] };
const BADGE_SEGNALE: Record<string, string> = { CONFERMATO: "bd-ok", NEUTRO: "bd-neutral", NON_VERIFICATO: "bd-amber", NEGATIVO: "bd-red" };
const EVENTI: Record<string, string> = {
  creato: "Richiesta ricevuta dal sito",
  conferma_inviata: "Conferma inviata al cliente",
  conferma_saltata: "Conferma non inviata (già inviata nelle 24 h)",
  conferma_errore: "Errore invio conferma al cliente",
  indagine: "Indagine AI completata",
  indagine_errore: "Indagine AI non riuscita",
  mail_inviata: "Mail inviata a shop@",
  mail_errore: "Errore invio mail a shop@",
  promemoria_inviato: "Promemoria inviato a shop@",
  promemoria_errore: "Errore invio promemoria",
  azione_verifica: "Messa in verifica",
  azione_approva: "Approvata",
  azione_scarta: "Scartata",
  export_integra: "File per Integra generato",
  export_errore: "Errore generazione file per Integra",
  cliente_collegato: "Cliente importato da Integra e collegato",
  invito_inviato: "Invito al portale inviato",
  invito_errore: "Errore invio invito",
  aggancio_senza_email: "Cliente in Integra senza email: invito non possibile",
  aggancio_conflitto: "P.IVA già collegata a un'altra richiesta",
  riesportazione_integra: "Dati di fatturazione confermati: file riesportato",
  anonimizzato: "Dati personali anonimizzati (conservazione 12 mesi)",
};
const AZIONI_PER_STATO: Record<Stato, Azione[]> = { NUOVO: ["scarta", "verifica", "approva"], IN_VALUTAZIONE: ["scarta", "approva"], APPROVATO: [], SCARTATO: [] };
const ETICHETTA_AZIONE: Record<Azione, string> = { approva: "Approva", verifica: "Metti in verifica", scarta: "Scarta" };

const dataOra = (s: string) => new Date(s).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", "");
const pill = ([cls, label]: [string, string]) => (
  <span className={`status-pill ${cls}`} style={cls ? undefined : { color: "var(--muted)" }}><span className="sd">●</span>{label}</span>
);
const IconOcchio = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;

export default function RichiesteAccessoSection() {
  const confirm = useConfirm();
  const [stato, setStato] = useState("da-decidere");
  const [verdetto, setVerdetto] = useState("tutti");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [dati, setDati] = useState<Pagina | null>(null);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [esito, setEsito] = useState<{ variant: "success" | "warning"; testo: string } | null>(null);
  const [dettaglio, setDettaglio] = useState<Dettaglio | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setQ(search.trim()); setPage(1); }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [search]);

  const carica = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ stato, page: String(page) });
      if (verdetto !== "tutti") p.set("verdetto", verdetto);
      if (q) p.set("q", q);
      if (sort) { p.set("sort", sort.key); p.set("dir", sort.dir); }
      setDati(await api.get<Pagina>(`/api/admin/leads?${p}`));
      setErrore(null);
    } catch (e) {
      setErrore(e instanceof ApiError ? e.code : "errors.generic");
    }
    setLoading(false);
  }, [stato, verdetto, q, page, sort]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- stesso schema di AdminOrdiniSection (fetch al cambio filtri)
  useEffect(() => { void carica(); }, [carica]);

  const apri = useCallback(async (id: number) => {
    try { setDettaglio(await api.get<Dettaglio>(`/api/admin/leads/${id}`)); }
    catch (e) { setErrore(e instanceof ApiError ? e.code : "errors.generic"); }
  }, []);

  useEffect(() => {
    if (!dettaglio) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDettaglio(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dettaglio]);

  function filtra(s: string) { setStato(s); setPage(1); }

  async function esegui(d: Dettaglio, azione: Azione) {
    const avvisoScarta = azione === "approva" && d.verdetto === "SCARTARE";
    const ok = await confirm({
      title: `${ETICHETTA_AZIONE[azione]} la richiesta #${d.id}?`,
      tone: azione === "scarta" ? "danger" : "default",
      confirmLabel: ETICHETTA_AZIONE[azione],
      message: (
        <>
          <div><strong>{d.ragioneSociale}</strong> · P.IVA {d.partitaIva}</div>
          {avvisoScarta && <div className="ra-warn-red">L&apos;indagine AI suggerisce di scartare: approvare solo dopo una verifica diretta.</div>}
          {azione === "approva" && <p style={{ fontSize: 13, color: "var(--muted)" }}>Verrà generato il file anagrafica per Integra; dopo l&apos;import il cliente sarà invitato al portale.</p>}
          {azione === "scarta" && <p style={{ fontSize: 13, color: "var(--muted)" }}>Al richiedente non viene inviata alcuna comunicazione. La decisione è definitiva.</p>}
          {azione === "verifica" && <p style={{ fontSize: 13, color: "var(--muted)" }}>Potrai approvare o scartare in seguito.</p>}
        </>
      ),
    });
    if (!ok) return;
    try {
      const r = await api.post<{ esito: string; export: { ok: boolean; file?: string; sedeMancante?: boolean; errore?: string } | null }>(`/api/admin/leads/${d.id}/azione`, { azione });
      if (r.esito === "gia_fatta") setEsito({ variant: "warning", testo: "La richiesta era già stata gestita: nessuna modifica." });
      else if (azione === "approva" && r.export?.ok)
        setEsito({ variant: r.export.sedeMancante ? "warning" : "success", testo: `Approvata · ${r.export.file} pronto per Integra${r.export.sedeMancante ? " — completare indirizzo in Integra" : ""}` });
      else if (azione === "approva") setEsito({ variant: "warning", testo: `Approvata, ma il file per Integra non è stato generato (${r.export?.errore ?? "errore"}).` });
      else setEsito({ variant: "success", testo: azione === "scarta" ? "Richiesta scartata." : "Richiesta messa in verifica." });
      window.dispatchEvent(new CustomEvent("leads-updated"));
      await Promise.all([carica(), apri(d.id)]);
    } catch (e) {
      setErrore(e instanceof ApiError ? e.code : "errors.generic");
    }
  }

  async function elimina(d: Dettaglio) {
    const ok = await confirm({
      title: `Eliminare la richiesta #${d.id}?`,
      tone: "danger",
      confirmLabel: "Elimina",
      message: (
        <>
          <div><strong>{d.ragioneSociale}</strong> · P.IVA {d.partitaIva}</div>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>La richiesta e tutti i suoi eventi verranno eliminati definitivamente. Azione irreversibile.</p>
        </>
      ),
    });
    if (!ok) return;
    try {
      await api.del(`/api/admin/leads/${d.id}`);
      setEsito({ variant: "success", testo: "Richiesta eliminata." });
      window.dispatchEvent(new CustomEvent("leads-updated"));
      setDettaglio(null);
      await carica();
    } catch (e) {
      setErrore(e instanceof ApiError ? e.code : "errors.generic");
    }
  }

  const colonne: Column<Riga>[] = useMemo(() => [
    { key: "id", header: "#", width: "64px", mono: true, sortable: true, sortValue: (r) => r.id, cell: (r) => <span style={{ fontWeight: 600, color: "var(--accent)" }}>{r.id}</span> },
    {
      key: "richiedente", header: "Richiedente", grow: true, sortable: true, sortValue: (r) => r.ragioneSociale.toLowerCase(), cell: (r) => (
        <div className="cell-entity"><div className="cell-entity-text">
          <div className="cell-entity-title">{r.ragioneSociale}</div>
          <div className="cell-entity-sub">{[r.citta, r.tipoAttivita ? TIPI[r.tipoAttivita] : null].filter(Boolean).join(" · ") || "—"}</div>
        </div></div>
      ),
    },
    { key: "piva", header: "P.IVA", width: "130px", mono: true, sortable: true, sortValue: (r) => r.partitaIva, cell: (r) => r.partitaIva },
    { key: "ricevuta", header: "Ricevuta", width: "140px", mono: true, sortable: true, sortValue: (r) => r.createdAt, cell: (r) => dataOra(r.createdAt) },
    { key: "verdetto", header: "Verdetto", width: "130px", sortable: true, sortValue: (r) => r.verdetto ?? "~", cell: (r) => (r.verdetto ? pill(VERDETTO_PILL[r.verdetto]) : <span style={{ color: "var(--muted)" }}>—</span>) },
    { key: "stato", header: "Stato", width: "130px", sortable: true, sortValue: (r) => r.stato, cell: (r) => pill(STATO_PILL[r.stato]) },
    {
      key: "attesa", header: "Attesa", width: "96px", sortable: true, sortValue: (r) => r.giorniAttesa ?? -1, cell: (r) => r.giorniAttesa == null ? "" : (
        <span className={`attesa${r.giorniAttesa > 6 ? " warn" : ""}`}>{r.giorniAttesa > 6 ? "⚠ " : ""}{r.giorniAttesa} gg</span>
      ),
    },
  ], []);
  const azioniRiga: RowAction<Riga>[] = useMemo(() => [{ icon: () => IconOcchio, tooltip: () => "Dettaglio", onClick: (r) => void apri(r.id) }], [apri]);

  const k = dati?.kpi;
  return (
    <div className="ra">
      <AdminTopBar
        title="Richieste accesso"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cerca ragione sociale, P.IVA, email, referente…"
        filter={stato}
        onFilterChange={filtra}
        filterOptions={[
          { value: "da-decidere", label: "Da decidere" },
          { value: "nuovo", label: "Nuove" },
          { value: "in-verifica", label: "In verifica" },
          { value: "approvato", label: "Approvate" },
          { value: "scartato", label: "Scartate" },
          { value: "tutti", label: "Tutte" },
        ]}
      >
        <select className="input filter-select" style={{ width: "auto", minWidth: 170 }} value={verdetto} onChange={(e) => { setVerdetto(e.target.value); setPage(1); }} aria-label="Filtra per verdetto">
          <option value="tutti">Tutti i verdetti</option>
          <option value="BUONO">Buono</option>
          <option value="VERIFICARE">Verificare</option>
          <option value="SCARTARE">Scartare</option>
        </select>
      </AdminTopBar>
      <div className="admin-content">
        {errore && <Notice variant="error" onClose={() => setErrore(null)}>Errore: {errore}</Notice>}
        {esito && <Notice variant={esito.variant} onClose={() => setEsito(null)}>{esito.testo}</Notice>}

        {k && (
          <div className="dash-grid">
            <button type="button" className={`dash-card${stato === "da-decidere" ? " is-active" : ""}`} onClick={() => filtra("da-decidere")}>
              <div className="label">Da decidere</div>
              <div className="value amber">{k.daDecidere}</div>
              <div className={`sub${k.ferme ? " warn" : ""}`}>{k.ferme ? `⚠ ${k.ferme} ferm${k.ferme === 1 ? "a" : "e"} da oltre 6 giorni` : "Nuove + in verifica"}</div>
            </button>
            <button type="button" className={`dash-card${stato === "in-verifica" ? " is-active" : ""}`} onClick={() => filtra("in-verifica")}>
              <div className="label">In verifica</div>
              <div className="value blue">{k.inVerifica}</div>
              <div className="sub">In attesa di riscontro</div>
            </button>
            <button type="button" className={`dash-card${stato === "approvato" ? " is-active" : ""}`} onClick={() => filtra("approvato")}>
              <div className="label">Approvate · 30 gg</div>
              <div className="value green">{k.approvate30}</div>
              <div className="sub">Decisione negli ultimi 30 giorni</div>
            </button>
            <button type="button" className={`dash-card${stato === "scartato" ? " is-active" : ""}`} onClick={() => filtra("scartato")}>
              <div className="label">Scartate · 30 gg</div>
              <div className="value">{k.scartate30}</div>
              <div className="sub">Decisione negli ultimi 30 giorni</div>
            </button>
          </div>
        )}

        {dati && (
          <DataTable
            columns={colonne}
            rows={dati.items}
            rowKey={(r) => r.id}
            actions={azioniRiga}
            emptyText={stato === "da-decidere" ? "Nessuna richiesta da decidere." : "Nessuna richiesta con i filtri selezionati."}
            loading={loading}
            page={dati.page}
            pageSize={10}
            total={dati.total}
            onPageChange={setPage}
            sortKey={sort?.key}
            sortDir={sort?.dir}
            onSort={(key, dir) => { setSort({ key, dir }); setPage(1); }}
          />
        )}
      </div>

      {dettaglio && <PannelloDettaglio d={dettaglio} onClose={() => setDettaglio(null)} onAzione={(a) => void esegui(dettaglio, a)} onElimina={() => void elimina(dettaglio)} />}
    </div>
  );
}

function PannelloDettaglio({ d, onClose, onAzione, onElimina }: { d: Dettaglio; onClose: () => void; onAzione: (a: Azione) => void; onElimina: () => void }) {
  const r = d.report;
  const vcls = r ? { BUONO: "ok", VERIFICARE: "amber", SCARTARE: "red" }[r.verdetto] : "amber";
  const azioni = d.anonimizzato ? [] : AZIONI_PER_STATO[d.stato];
  const sede = d.sedeIndirizzo ? `${d.sedeIndirizzo}, ${d.sedeCap ?? ""} ${d.sedeCitta ?? ""} (${d.sedeProvincia ?? ""})` : null;
  const kv = (k: string, v: React.ReactNode) => <div className="kv-row"><span className="k">{k}</span><span className="v">{v ?? "—"}</span></div>;

  return (
    <>
      <div className="ra-drawer-overlay" onClick={onClose} />
      <FocusTrap>
        <aside className="ra-drawer ra" role="dialog" aria-modal="true" aria-labelledby="ra-drawer-title">
          <div className="drawer-head">
            <div>
              <div className="rid">Richiesta #{d.id}</div>
              <h2 id="ra-drawer-title">{d.ragioneSociale}</h2>
              <div className="meta-row">
                {d.verdetto ? pill(VERDETTO_PILL[d.verdetto]) : pill(["", "Indagine n.d."])}
                {pill(STATO_PILL[d.stato])}
                <span className="meta-text">ricevuta {dataOra(d.createdAt)} · lingua {d.lingua.toUpperCase()}</span>
              </div>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Chiudi dettaglio">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          <div className="drawer-body">
            <div className="drawer-section">
              <p className="section-label">Dati richiesta</p>
              <div className="kv-grid">
                <div>
                  {kv("P.IVA", d.partitaIva)}
                  {kv("Codice fiscale", d.codiceFiscale)}
                  {kv("Referente", d.referente)}
                  {kv("Email", d.email)}
                  {kv("Telefono", d.telefono)}
                  {kv("Tipo attività", d.tipoAttivita ? TIPI[d.tipoAttivita] : null)}
                </div>
                <div>
                  {kv("Sede legale", sede)}
                  {kv("Fonte sede", d.sedeFonte)}
                  {kv("Comune dichiarato", d.citta)}
                  {d.cliente && kv("Cliente Integra", d.cliente.codiceCliente)}
                  {d.cliente && kv("Fatturazione", d.cliente.datiFatturazioneConfermatiIl ? `confermata ${dataOra(d.cliente.datiFatturazioneConfermatiIl)}` : "da confermare")}
                  {d.esportatoFile && kv("File Integra", d.esportatoFile)}
                </div>
              </div>
              {d.messaggio && <div className="msg-box"><strong style={{ fontSize: 11, color: "var(--muted)" }}>MESSAGGIO</strong><p>{d.messaggio}</p></div>}
            </div>

            <div className="drawer-section">
              <p className="section-label">Report AI</p>
              {!r && <p style={{ fontSize: 13, color: "var(--muted)" }}>Indagine non disponibile: valutazione manuale.</p>}
              {r?.segnali.map((s) => (
                <div className="signal-row" key={s.chiave}>
                  <span className="sig-label">{s.etichetta}</span>
                  <span>
                    {s.nota}
                    {s.fonti.map((u, i) => (
                      <a key={u} className="src" href={u} target="_blank" rel="noopener noreferrer" title={u}>[{i + 1}]</a>
                    ))}
                  </span>
                  <span className={`bd ${BADGE_SEGNALE[s.stato] ?? "bd-amber"}`}>{s.stato.replace("_", " ")}</span>
                </div>
              ))}
              {r?.sintesi && <p className="sintesi">{r.sintesi}</p>}
              {r && (
                <div className="verdict-box">
                  <span className="vchip">Verdetto AI</span>
                  <span className={`vval ${vcls}`}>{r.verdetto}</span>
                  <div className="vnote">{r.motivazione} · {(r.durataMs / 1000).toFixed(0)} s{r.errore ? ` · ${r.errore}` : ""}</div>
                </div>
              )}
              {r?.verdetto === "VERIFICARE" && r.checklist.length > 0 && (
                <div className="checklist"><strong style={{ fontSize: 11, color: "var(--amber)" }}>CHECKLIST DI VERIFICA</strong><ul>{r.checklist.map((c) => <li key={c}>{c}</li>)}</ul></div>
              )}
            </div>

            <div className="drawer-section">
              <p className="section-label">Storico</p>
              <div className="timeline">
                {d.eventi.map((e) => (
                  <div key={e.id} className={`tl-item${e.tipo.startsWith("azione_") ? " accent" : ""}`}>
                    <div className="tl-when">{dataOra(e.createdAt)}</div>
                    <div className="tl-what">{EVENTI[e.tipo] ?? e.tipo}{e.dettagli && "origine" in e.dettagli ? " (area admin)" : ""}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="drawer-section">
              <p className="section-label">Consenso privacy</p>
              <div className="consent-box">Accettato il {dataOra(d.privacyAccettataIl)} · versione {d.privacyVersione} · IP {d.ip ?? "—"}</div>
            </div>

            {azioni.length === 0 && (
              <div className="final-note">
                {d.anonimizzato ? "Richiesta anonimizzata: sola consultazione." : `Decisione presa${d.decisioneIl ? ` il ${dataOra(d.decisioneIl)}` : ""}: sola consultazione.`}
              </div>
            )}
          </div>

          {azioni.length > 0 && (
            <div className="drawer-foot">
              {azioni.map((a) => (
                <button key={a} type="button" className={`btn ${a === "approva" ? "btn-primary" : "btn-secondary"}`} style={a === "scarta" ? { color: "var(--red)" } : undefined} onClick={() => onAzione(a)}>
                  {a === "approva" ? "✓ " : ""}{ETICHETTA_AZIONE[a]}
                </button>
              ))}
              <button type="button" className="btn btn-secondary" style={{ color: "var(--red)", marginLeft: "auto" }} onClick={onElimina}>Elimina</button>
            </div>
          )}
          {azioni.length === 0 && (
            <div className="drawer-foot">
              <button type="button" className="btn btn-secondary" style={{ color: "var(--red)", marginLeft: "auto" }} onClick={onElimina}>Elimina</button>
            </div>
          )}
        </aside>
      </FocusTrap>
    </>
  );
}
