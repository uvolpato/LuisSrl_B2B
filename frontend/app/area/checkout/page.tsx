"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/use-auth";
import { api, ApiError } from "../../../lib/api";
import LoadingScreen from "../../../components/common/LoadingScreen";
import AreaHeader from "../../../components/area/AreaHeader";
import AreaFooter from "../../../components/area/AreaFooter";

function formatPrice(n: number) {
  return "€ " + n.toFixed(2).replace(".", ",");
}

interface PrezzoInfo {
  prezzoNetto: number;
  prezzoListino: number;
  sconto: number;
}

interface CartItem {
  id: number;
  varianteCodice: string;
  quantita: number;
  salvato: boolean;
  articoloNome: string | null;
  articoloCodiceLinea: string | null;
  varianteDescrizione: string | null;
  dimensioni: string;
  immagineUrl: string | null;
  multiplo: number;
  prezzo: PrezzoInfo | null;
}

type ModalitaConsegna = "RITIRO" | "SPEDIZIONE" | "MEZZI_PROPRI";

interface DatiCheckout {
  cliente: {
    id: number;
    ragioneSociale: string | null;
    codicePagamento: string | null;
    codicePorto: string | null;
    codiceSpedizione: string | null;
    codiceVettore: string | null;
  };
  indirizzi: Array<{
    id: number;
    codiceDestinazione: string | null;
    ragioneSociale: string | null;
    indirizzo: string | null;
    cap: string | null;
    citta: string | null;
    provincia: string | null;
    flagSpedizione: boolean;
    flagAbituale: boolean;
    tipoDestinazione: string | null;
    codicePorto: string | null;
    codiceVettore: string | null;
  }>;
  allowNewAddress: boolean;
  pagamenti: Array<{ codice: string; descrizione: string }>;
  porti: Array<{ codice: string; descrizione: string }>;
  spedizioni: Array<{ codice: string; descrizione: string }>;
  vettori: Array<{ codice: string; descrizione: string }>;
  descrizioni: {
    pagamento: string | null;
    porto: string | null;
    spedizione: string | null;
    vettore: string | null;
  };
}

interface OrdineConfermato {
  id: number;
  numeroOrdine: string;
  importoTotale: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth("customer");
  const [dati, setDati] = useState<DatiCheckout | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [indirizzoId, setIndirizzoId] = useState<number | null>(null);
  const [modalita, setModalita] = useState<ModalitaConsegna>("SPEDIZIONE");
  const [porto, setPorto] = useState<string>("");
  const [vettore, setVettore] = useState<string>("--");
  const [notaSpedizione, setNotaSpedizione] = useState("");
  const [notaOrdine, setNotaOrdine] = useState("");

  const [showNuovo, setShowNuovo] = useState(false);
  const [nRagione, setNRagione] = useState("");
  const [nIndirizzo, setNIndirizzo] = useState("");
  const [nCap, setNCap] = useState("");
  const [nCitta, setNCitta] = useState("");
  const [nProvincia, setNProvincia] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confermato, setConfermato] = useState<OrdineConfermato | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [d, c] = await Promise.all([
        api.get<DatiCheckout>("/api/checkout/dati"),
        api.get<{ id: number; items: CartItem[] }>("/api/carrello"),
      ]);
      setDati(d);
      const active = (c.items ?? []).filter((i) => !i.salvato);
      setItems(active);
      // Default sede spedizione: primo indirizzo con flagSpedizione, altrimenti il primo
      const def = d.indirizzi.find((i) => i.flagSpedizione) ?? d.indirizzi[0] ?? null;
      setIndirizzoId(def ? def.id : null);
      // Porto / vettore: dall'indirizzo se presenti, altrimenti dal cliente
      const portoDef = (def?.codicePorto) || d.cliente.codicePorto || "";
      const vettDef = (def?.codiceVettore) || d.cliente.codiceVettore || "--";
      setPorto(portoDef);
      setVettore(vettDef);
      // Modalità di consegna di default: spedizione se esiste un vettore o un indirizzo, altrimenti ritiro in sede
      setModalita(d.cliente.codiceVettore || d.indirizzi.length > 0 ? "SPEDIZIONE" : "RITIRO");
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "errors.generic");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && user) fetchAll();
  }, [authLoading, user, fetchAll]);

  const indirizzoSelezionato = useMemo(
    () => dati?.indirizzi.find((i) => i.id === indirizzoId) ?? null,
    [dati, indirizzoId],
  );

  function selezionaIndirizzo(id: number) {
    const addr = dati?.indirizzi.find((i) => i.id === id) ?? null;
    setIndirizzoId(id);
    // Porto/vettore ereditati dall'indirizzo se valorizzati, altrimenti dal cliente
    setPorto((addr?.codicePorto) || (dati?.cliente.codicePorto) || "");
    setVettore((addr?.codiceVettore) || (dati?.cliente.codiceVettore) || "--");
  }

  const subtotalQty = items.reduce((s, i) => s + i.quantita, 0);
  const subtotalAmount = items.reduce((s, i) => s + i.quantita * (i.prezzo?.prezzoNetto ?? 0), 0);

  async function conferma() {
    if (!dati) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const nuovoIndirizzo =
        showNuovo && nIndirizzo.trim() && nCap.trim() && nCitta.trim()
          ? {
              ragioneSociale: nRagione || undefined,
              indirizzo: nIndirizzo.trim(),
              cap: nCap.trim(),
              citta: nCitta.trim(),
              provincia: nProvincia || undefined,
            }
          : undefined;
      const res = await api.post<OrdineConfermato>("/api/checkout/conferma", {
        modalitaConsegna: modalita,
        indirizzoSpedizioneId: modalita === "RITIRO" ? undefined : indirizzoId ?? undefined,
        nuovoIndirizzo,
        codicePorto: porto || undefined,
        codiceVettore: vettore && vettore !== "--" ? vettore : undefined,
        codicePagamento: dati.cliente.codicePagamento ?? undefined,
        notaSpedizione: notaSpedizione || undefined,
        notaOrdine: notaOrdine || undefined,
      });
      setConfermato(res);
      window.dispatchEvent(new CustomEvent("cart-updated"));
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.code : "errors.generic");
    }
    setSubmitting(false);
  }

  if (authLoading || !user || user.userType !== "customer") return <LoadingScreen />;

  if (confermato) {
    return (
      <div className="catalogo-page cart-page checkout-page">
        <AreaHeader />
        <main id="content">
          <div className="container">
            <div className="checkout-confirm">
              <div className="checkout-confirm-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1>Ordine inviato</h1>
              <p className="checkout-confirm-sub">
                Ordine <strong>{confermato.numeroOrdine}</strong> creato con successo.
              </p>
              <div className="checkout-confirm-total">
                <span>Totale (IVA esclusa)</span>
                <strong>{formatPrice(confermato.importoTotale)}</strong>
              </div>
              <div className="checkout-confirm-actions">
                <Link href="/area/catalogo" className="btn btn-primary">Continua lo shopping</Link>
                <Link href="/area" className="btn btn-secondary">Area personale</Link>
              </div>
            </div>
          </div>
        </main>
        <AreaFooter />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="catalogo-page cart-page">
        <AreaHeader />
        <main id="content"><div className="container" style={{ paddingBlock: 48, color: "var(--muted)" }}>Caricamento…</div></main>
        <AreaFooter />
      </div>
    );
  }

  if (error || !dati) {
    return (
      <div className="catalogo-page cart-page">
        <AreaHeader />
        <main id="content"><div className="container" style={{ paddingBlock: 48, textAlign: "center" }}>
          <p style={{ color: "var(--muted)", marginBottom: 20 }}>Impossibile caricare i dati di checkout.</p>
          <Link href="/area/carrello" className="btn btn-primary">Torna al carrello</Link>
        </div></main>
        <AreaFooter />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="catalogo-page cart-page">
        <AreaHeader />
        <main id="content"><div className="container" style={{ paddingBlock: 48, textAlign: "center" }}>
          <p style={{ color: "var(--muted)", marginBottom: 20 }}>Il carrello è vuoto.</p>
          <Link href="/area/catalogo" className="btn btn-primary">Continua lo shopping</Link>
        </div></main>
        <AreaFooter />
      </div>
    );
  }

  return (
    <div className="catalogo-page cart-page checkout-page">
      <AreaHeader />
      <main id="content">
        <div className="container">
          <div className="page-title">
            <h1>Checkout</h1>
          </div>

          <div className="checkout-layout">
            <div className="checkout-form">
              {/* Modalità di consegna */}
              <section className="checkout-section">
                <h2 className="checkout-section-title">Modalità di consegna</h2>
                <div className="opt-list">
                  <label className={"opt-card" + (modalita === "RITIRO" ? " selected" : "")}>
                    <input
                      type="radio"
                      name="modalita"
                      checked={modalita === "RITIRO"}
                      onChange={() => setModalita("RITIRO")}
                    />
                    <span className="opt-main">
                      <span className="opt-name">Ritiro in sede</span>
                      <span className="opt-desc">Ritiri tu stesso la merce presso la nostra sede.</span>
                    </span>
                  </label>
                  <label className={"opt-card" + (modalita === "SPEDIZIONE" ? " selected" : "")}>
                    <input
                      type="radio"
                      name="modalita"
                      checked={modalita === "SPEDIZIONE"}
                      onChange={() => setModalita("SPEDIZIONE")}
                    />
                    <span className="opt-main">
                      <span className="opt-name">Spedizione corriere</span>
                      <span className="opt-desc">Consegnamo tramite vettore all'indirizzo indicato.</span>
                    </span>
                  </label>
                  <label className={"opt-card" + (modalita === "MEZZI_PROPRI" ? " selected" : "")}>
                    <input
                      type="radio"
                      name="modalita"
                      checked={modalita === "MEZZI_PROPRI"}
                      onChange={() => setModalita("MEZZI_PROPRI")}
                    />
                    <span className="opt-main">
                      <span className="opt-name">Consegna a mezzi propri</span>
                      <span className="opt-desc">Ritira con tuo mezzo all'indirizzo indicato.</span>
                    </span>
                  </label>
                </div>
              </section>

              {/* Sede di spedizione (solo per spedizione/mezzi propri) */}
              {modalita !== "RITIRO" && (
                <section className="checkout-section">
                  <h2 className="checkout-section-title">Sede di spedizione</h2>
                  {dati.indirizzi.length === 0 && !showNuovo ? (
                    <p className="checkout-note">
                      Nessun indirizzo di spedizione salvato.
                      {dati.allowNewAddress
                        ? " Puoi indicarne uno nuovo qui sotto."
                        : " La merce verrà inviata alla sede dell'anagrafica."}
                    </p>
                  ) : (
                    <div className="addr-list">
                      {dati.indirizzi.map((a) => (
                        <label
                          key={a.id}
                          className={"addr-card" + (a.id === indirizzoId ? " selected" : "")}
                        >
                          <input
                            type="radio"
                            name="indirizzo"
                            checked={a.id === indirizzoId}
                            onChange={() => selezionaIndirizzo(a.id)}
                          />
                          <span className="addr-main">
                            <span className="addr-name">{a.ragioneSociale ?? dati.cliente.ragioneSociale ?? "Sede"}</span>
                            {(a.indirizzo || a.citta) && (
                              <span className="addr-line">
                                {[a.indirizzo, a.cap, a.citta, a.provincia].filter(Boolean).join(" ")}
                              </span>
                            )}
                            {(a.codicePorto || a.codiceVettore) && (
                              <span className="addr-meta">
                                {a.codicePorto && <span className="badge">Porto {a.codicePorto}</span>}
                                {a.codiceVettore && <span className="badge">Vett {a.codiceVettore}</span>}
                              </span>
                            )}
                          </span>
                          {a.flagAbituale && <span className="addr-default">Abituale</span>}
                        </label>
                      ))}
                    </div>
                  )}

                  {dati.allowNewAddress && !showNuovo && (
                    <button type="button" className="btn btn-secondary addr-add-btn" onClick={() => setShowNuovo(true)}>
                      + Indica un nuovo indirizzo
                    </button>
                  )}

                  {showNuovo && (
                    <div className="addr-new">
                      <div className="checkout-grid">
                        <div className="form-field">
                          <label htmlFor="nRagione">Intestazione</label>
                          <input id="nRagione" className="form-input" value={nRagione} onChange={(e) => setNRagione(e.target.value)} placeholder="Es. Nome destinatario" />
                        </div>
                        <div className="form-field">
                          <label htmlFor="nIndirizzo">Indirizzo *</label>
                          <input id="nIndirizzo" className="form-input" value={nIndirizzo} onChange={(e) => setNIndirizzo(e.target.value)} />
                        </div>
                        <div className="form-field">
                          <label htmlFor="nCap">CAP *</label>
                          <input id="nCap" className="form-input" value={nCap} onChange={(e) => setNCap(e.target.value)} />
                        </div>
                        <div className="form-field">
                          <label htmlFor="nCitta">Città *</label>
                          <input id="nCitta" className="form-input" value={nCitta} onChange={(e) => setNCitta(e.target.value)} />
                        </div>
                        <div className="form-field">
                          <label htmlFor="nProvincia">Provincia</label>
                          <input id="nProvincia" className="form-input" value={nProvincia} onChange={(e) => setNProvincia(e.target.value)} maxLength={2} />
                        </div>
                      </div>
                      <button type="button" className="btn btn-ghost addr-cancel" onClick={() => setShowNuovo(false)}>
                        Annulla
                      </button>
                    </div>
                  )}
                </section>
              )}

              {/* Ritiro in sede */}
              {modalita === "RITIRO" && (
                <section className="checkout-section">
                  <h2 className="checkout-section-title">Ritiro in sede</h2>
                  <p className="checkout-note">Indica data e orario in cui verrai a ritirare la merce presso la nostra sede.</p>
                </section>
              )}

              {/* Porto / Vettore */}
              <section className="checkout-section">
                <h2 className="checkout-section-title">Modalità di trasporto</h2>
                <div className="checkout-grid">
                  <div className="form-field">
                    <label htmlFor="porto">Porto</label>
                    <select
                      id="porto"
                      className="form-select"
                      value={porto}
                      onChange={(e) => setPorto(e.target.value)}
                    >
                      {dati.porti.map((p) => (
                        <option key={p.codice} value={p.codice}>{p.codice} — {p.descrizione}</option>
                      ))}
                    </select>
                  </div>
                  {modalita === "SPEDIZIONE" && (
                    <div className="form-field">
                      <label htmlFor="vettore">Vettore</label>
                      <select
                        id="vettore"
                        className="form-select"
                        value={vettore}
                        onChange={(e) => setVettore(e.target.value)}
                      >
                        {dati.vettori.map((v) => (
                          <option key={v.codice} value={v.codice}>
                            {v.descrizione && v.descrizione !== v.codice ? `${v.codice} — ${v.descrizione}` : v.codice}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="form-field">
                    <label>Pagamento</label>
                    <div className="read-only-field">
                      {dati.cliente.codicePagamento ?? "--"} — {dati.descrizioni.pagamento ?? "—"}
                    </div>
                    <span className="form-hint">Condizioni di pagamento dall'anagrafica (non modificabili).</span>
                  </div>
                </div>
              </section>

              {/* Note */}
              <section className="checkout-section">
                <h2 className="checkout-section-title">Note</h2>
                <div className="checkout-grid">
                  <div className="form-field">
                    <label htmlFor="notaSpedizione">Nota di spedizione</label>
                    <textarea
                      id="notaSpedizione"
                      className="form-textarea"
                      rows={3}
                      value={notaSpedizione}
                      onChange={(e) => setNotaSpedizione(e.target.value)}
                      placeholder="Es. consegna al piano, orari preferiti…"
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="notaOrdine">Nota d'ordine</label>
                    <textarea
                      id="notaOrdine"
                      className="form-textarea"
                      rows={3}
                      value={notaOrdine}
                      onChange={(e) => setNotaOrdine(e.target.value)}
                      placeholder="Es. riferimento commessa interna…"
                    />
                  </div>
                </div>
              </section>
            </div>

            <aside className="order-summary checkout-summary">
              <h2>Riepilogo ordine</h2>
              {indirizzoSelezionato && (
                <div className="summary-ship">
                  <span className="label">Spedizione a</span>
                  <span className="value">{indirizzoSelezionato.ragioneSociale ?? dati.cliente.ragioneSociale}</span>
                  <span className="summary-ship-line">
                    {[indirizzoSelezionato.indirizzo, indirizzoSelezionato.cap, indirizzoSelezionato.citta, indirizzoSelezionato.provincia].filter(Boolean).join(" ")}
                  </span>
                </div>
              )}
              <div className="summary-rows">
                {items.map((i) => (
                  <div key={i.varianteCodice} className="summary-item">
                    <span className="summary-item-name">
                      <span className="badge code">{i.varianteCodice}</span>
                      {i.articoloNome && <span>{i.articoloNome}</span>}
                    </span>
                    <span className="summary-item-meta">
                      {i.quantita} pz × {formatPrice(i.prezzo?.prezzoNetto ?? 0)}
                    </span>
                    <span className="summary-item-price">{formatPrice(i.quantita * (i.prezzo?.prezzoNetto ?? 0))}</span>
                  </div>
                ))}
              </div>
              <hr className="summary-divider" />
              <div className="summary-row">
                <span className="label">Subtotale ({subtotalQty} pz)</span>
                <span className="value">{formatPrice(subtotalAmount)}</span>
              </div>
              <div className="summary-total">
                <span className="label">Totale IVA esclusa</span>
                <span className="value">{formatPrice(subtotalAmount)}</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 0" }}>
                IVA non inclusa · Spese di trasporto da confermare
              </p>
              {modalita === "RITIRO" && !notaSpedizione.trim() && (
                <p className="checkout-error">Indica data e ora di ritiro in sede.</p>
              )}
              {modalita !== "RITIRO" && !indirizzoId && !(showNuovo && nIndirizzo.trim() && nCap.trim() && nCitta.trim()) && (
                <p className="checkout-error">Seleziona o indica un indirizzo di spedizione.</p>
              )}
              {submitError && <p className="checkout-error">{submitError}</p>}
              <button
                className="btn btn-primary checkout-btn"
                disabled={
                  submitting ||
                  (modalita === "RITIRO" ? !notaSpedizione.trim() : !indirizzoId && !(showNuovo && nIndirizzo.trim() && nCap.trim() && nCitta.trim()))
                }
                onClick={conferma}
              >
                {submitting ? "Invio in corso…" : "Conferma ordine"}
              </button>
              <Link href="/area/carrello" className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
                Torna al carrello
              </Link>
            </aside>
          </div>
        </div>
      </main>
      <AreaFooter />
    </div>
  );
}
