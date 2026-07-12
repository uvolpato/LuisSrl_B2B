"use client";

import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "../../lib/api";
import type {
  CustomerProfile,
  IndirizzoCliente,
  ContattoCliente,
  OrdineCliente,
  OrdiniResponse,
} from "../../lib/types";
import Modal from "../common/Modal";
import Notice from "../common/Notice";
import SyncButton from "../common/SyncButton";
import { useConfirm } from "../common/ConfirmProvider";
import ProvisionalPasswordModal from "./ProvisionalPasswordModal";
import OrdineDetailModal from "./OrdineDetailModal";

export type UserEditorTarget =
  | { mode: "create" }
  | { mode: "edit"; user: CustomerProfile };

type Tab = "anagrafica" | "indirizzi" | "contatti" | "ordini";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
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

function ReadOnlyField({ label, value, full }: { label: string; value?: string | null; full?: boolean }) {
  return (
    <Field label={label} full={full}>
      <input className="input" value={value ?? ""} readOnly disabled />
    </Field>
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
  const [tab, setTab] = useState<Tab>("anagrafica");
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
  const [loadingLinked, setLoadingLinked] = useState(false);
  const [linkedError, setLinkedError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [provisional, setProvisional] = useState<{ email: string; password: string } | null>(null);
  const initialFormRef = useRef(form);
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialFormRef.current);
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
      setError(err instanceof ApiError ? err.code : "errors.generic");
      setDeleting(false);
    }
  }

  async function onResetPassword() {
    if (!editing) return;
    if (!(await confirm({ message: t("confirmReset"), tone: "danger" }))) return;
    setResetting(true);
    setError(null);
    try {
      const res = await api.post<{ provisionalPassword: string }>(`/api/customers/${editing.id}/reset-password`);
      setProvisional({ email: editing.email, password: res.provisionalPassword });
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "errors.generic");
    } finally {
      setResetting(false);
    }
  }

  async function handleCancel() {
    if (isDirty && !(await confirm({ message: t("confirmDiscard"), tone: "danger" }))) return;
    onClose();
  }

  async function loadIndirizzi() {
    if (!editing) return;
    setLoadingLinked(true);
    setLinkedError(null);
    try {
      const r = await api.get<IndirizzoCliente[]>(`/api/customers/${editing.id}/indirizzi`);
      setIndirizzi(r);
    } catch (err) {
      setLinkedError(err instanceof ApiError ? err.code : "errors.generic");
    } finally {
      setLoadingLinked(false);
    }
  }

  async function loadContatti() {
    if (!editing) return;
    setLoadingLinked(true);
    setLinkedError(null);
    try {
      const r = await api.get<ContattoCliente[]>(`/api/customers/${editing.id}/contatti`);
      setContatti(r);
    } catch (err) {
      setLinkedError(err instanceof ApiError ? err.code : "errors.generic");
    } finally {
      setLoadingLinked(false);
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

  function handleSort(field: string) {
    const same = ordiniSortBy === field;
    const newDir = same && ordiniSortDir === "asc" ? "desc" : "asc";
    setOrdiniSortBy(field);
    setOrdiniSortDir(newDir);
    setOrdiniPage(1);
    void loadOrdini(undefined, 1, field, newDir);
  }

  useEffect(() => {
    if (tab === "indirizzi" && indirizzi.length === 0) void loadIndirizzi();
    if (tab === "contatti" && contatti.length === 0) void loadContatti();
    if (tab === "ordini") void loadOrdini("", 1);
  }, [tab, editing]);

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
      if (editing) {
        await api.patch(`/api/customers/${editing.id}`, payload);
        onSaved(null);
      } else {
        const res = await api.post<{ customer: CustomerProfile; provisionalPassword: string }>("/api/customers", {
          email: form.email,
          ...payload,
        });
        onSaved({ email: res.customer.email, password: res.provisionalPassword });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "errors.generic");
      setBusy(false);
    }
  }

  return (<>
    <Modal
      open
      onClose={onClose}
      noHeader
      footer={
        <>
          {editing && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? "Eliminazione..." : t("delete")}
            </button>
          )}
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
        <h2>{editing ? (editing.ragioneSociale || editing.nome || t("editTitle")) : t("createTitle")}</h2>
        <button className="modal-root-close" onClick={onClose} aria-label="Chiudi">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {editing && (
        <div className="modal-tabs-bar">
          <button className={`modal-tab-btn ${tab === "anagrafica" ? "active" : ""}`} onClick={() => setTab("anagrafica")}>Anagrafica</button>
          <button className={`modal-tab-btn ${tab === "indirizzi" ? "active" : ""}`} onClick={() => setTab("indirizzi")}>Indirizzi</button>
          <button className={`modal-tab-btn ${tab === "contatti" ? "active" : ""}`} onClick={() => setTab("contatti")}>Contatti</button>
          <button className={`modal-tab-btn ${tab === "ordini" ? "active" : ""}`} onClick={() => setTab("ordini")}>Ordini</button>
        </div>
      )}

      <div className="modal-body" style={{ flex: 1, overflowY: tab === "ordini" ? "hidden" : "auto", display: tab === "ordini" ? "flex" : undefined, flexDirection: tab === "ordini" ? "column" : undefined }}>
        {tab === "anagrafica" && (
          <form id="user-editor-form" onSubmit={onSubmit}>
            {error && <Notice variant="error" onClose={() => setError(null)}>{tServer(error)}</Notice>}

            {editing ? (
              <>
                <Section title="Anagrafica">
                  <ReadOnlyField label="Codice cliente" value={editing.codiceCliente} />
                  <ReadOnlyField label="Listino" value={editing.codiceListino} />
                  <Field label={t("fieldCompany")} full>
                    <input
                      className="input"
                      value={form.ragioneSociale}
                      onChange={(e) => set("ragioneSociale", e.target.value)}
                    />
                  </Field>
                  <Field label={t("fieldPiva")}>
                    <input
                      className="input"
                      value={form.partitaIva}
                      onChange={(e) => set("partitaIva", e.target.value)}
                    />
                  </Field>
                </Section>

                <Section title="Contatti">
                  <Field label={t("fieldEmail")} full>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        className="input"
                        type="email"
                        required
                        disabled
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        style={{ flex: 1 }}
                      />
                      {editing && (
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm admin-btn-secondary"
                          disabled={resetting}
                          onClick={onResetPassword}
                          style={{ whiteSpace: "nowrap", flexShrink: 0 }}
                        >
                          {resetting ? "..." : "Reset password"}
                        </button>
                      )}
                    </div>
                  </Field>
                  <Field label={t("fieldName")}>
                    <input
                      className="input"
                      required
                      value={form.nome}
                      onChange={(e) => set("nome", e.target.value)}
                    />
                  </Field>
                  <Field label={t("fieldPhone")}>
                    <input
                      className="input"
                      value={form.telefono}
                      onChange={(e) => set("telefono", e.target.value)}
                    />
                  </Field>
                  <Field label={t("fieldLanguage")}>
                    <select
                      className="input"
                      value={form.preferredLanguage}
                      onChange={(e) => set("preferredLanguage", e.target.value)}
                    >
                      <option value="it">Italiano</option>
                      <option value="en">English</option>
                    </select>
                  </Field>
                </Section>

                <Section title="Sede">
                  <ReadOnlyField label="Indirizzo" value={editing.indirizzo} full />
                  <ReadOnlyField label="CAP" value={editing.cap} />
                  <ReadOnlyField label="Città" value={editing.citta} />
                  <ReadOnlyField label="Provincia" value={editing.provincia} />
                </Section>

                <Section title="Condizioni commerciali">
                  <ReadOnlyField label="Pagamento" value={editing.codicePagamentoDescrizione || editing.codicePagamento} />
                  <ReadOnlyField label="Fido" value={editing.fido != null ? String(editing.fido) : null} />
                </Section>
              </>
            ) : (
              <Section title={t("createTitle")}>
                <Field label={t("fieldEmail")} full>
                  <input
                    className="input"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                </Field>
                <Field label={t("fieldName")}>
                  <input
                    className="input"
                    required
                    value={form.nome}
                    onChange={(e) => set("nome", e.target.value)}
                  />
                </Field>
                <Field label={t("fieldCompany")}>
                  <input
                    className="input"
                    value={form.ragioneSociale}
                    onChange={(e) => set("ragioneSociale", e.target.value)}
                  />
                </Field>
                <Field label={t("fieldPiva")}>
                  <input
                    className="input"
                    value={form.partitaIva}
                    onChange={(e) => set("partitaIva", e.target.value)}
                  />
                </Field>
                <Field label={t("fieldPhone")}>
                  <input
                    className="input"
                    value={form.telefono}
                    onChange={(e) => set("telefono", e.target.value)}
                  />
                </Field>
                <Field label={t("fieldLanguage")}>
                  <select
                    className="input"
                    value={form.preferredLanguage}
                    onChange={(e) => set("preferredLanguage", e.target.value)}
                  >
                    <option value="it">Italiano</option>
                    <option value="en">English</option>
                  </select>
                </Field>
              </Section>
            )}
          </form>
        )}

        {tab === "indirizzi" && (
          <div>
            {linkedError && <Notice variant="error" onClose={() => setLinkedError(null)}>{tServer(linkedError)}</Notice>}
            {loadingLinked ? (
              <p className="meta">Caricamento…</p>
            ) : indirizzi.length === 0 ? (
              <p className="meta">Nessun indirizzo di spedizione.</p>
            ) : (
              <div className="data-table">
                <div className="data-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Ragione sociale</th>
                        <th>Indirizzo</th>
                        <th>CAP</th>
                        <th>Città</th>
                        <th>Prov.</th>
                        <th style={{ textAlign: "center" }}>Sped.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {indirizzi.map((a) => (
                        <tr key={a.id}>
                          <td>{a.ragioneSociale || "—"}</td>
                          <td>{a.indirizzo || "—"}</td>
                          <td>{a.cap || "—"}</td>
                          <td>{a.citta || "—"}</td>
                          <td>{a.provincia || "—"}</td>
                          <td style={{ textAlign: "center" }}>{a.flagSpedizione ? "✓" : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "contatti" && (
          <div>
            {linkedError && <Notice variant="error" onClose={() => setLinkedError(null)}>{tServer(linkedError)}</Notice>}
            {loadingLinked ? (
              <p className="meta">Caricamento…</p>
            ) : contatti.length === 0 ? (
              <p className="meta">Nessun contatto.</p>
            ) : (
              <div className="data-table">
                <div className="data-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Data</th>
                        <th>Contenuto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contatti.map((c) => (
                        <tr key={c.id}>
                          <td>{c.tipo}</td>
                          <td className="mono">{fmtDate(c.data)}</td>
                          <td>{c.contenuto}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "ordini" && editing && (
          <div className="ordini-tab">
            {linkedError && <div style={{ flexShrink: 0 }}><Notice variant="error" onClose={() => setLinkedError(null)}>{tServer(linkedError)}</Notice></div>}

            <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
              <div className="admin-search" style={{ flex: 1 }}>
                <span className="search-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
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
                className="input"
                style={{ width: 80, flexShrink: 0 }}
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
                      <col />
                      <col style={{ width: 140 }} />
                      <col style={{ width: 110 }} />
                      <col style={{ width: 130 }} />
                      <col style={{ width: 50 }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="sortable" onClick={() => handleSort("numeroOrdine")}>Ordine{ordiniSortBy === "numeroOrdine" && (ordiniSortDir === "asc" ? " ▲" : " ▼")}</th>
                        <th className="sortable" onClick={() => handleSort("dataOrdine")}>Data{ordiniSortBy === "dataOrdine" && (ordiniSortDir === "asc" ? " ▲" : " ▼")}</th>
                        <th className="sortable" onClick={() => handleSort("stato")}>Stato{ordiniSortBy === "stato" && (ordiniSortDir === "asc" ? " ▲" : " ▼")}</th>
                        <th className="sortable" style={{ textAlign: "right" }} onClick={() => handleSort("importoTotale")}>Totale{ordiniSortBy === "importoTotale" && (ordiniSortDir === "asc" ? " ▲" : " ▼")}</th>
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
                          <td>{o.stato || "—"}</td>
                          <td className="mono" style={{ textAlign: "right", fontSize: 13 }}>
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

                <div className="data-table-footer">
                  <span className="data-table-range">
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
      </div>
    </Modal>
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
  </>);
}
