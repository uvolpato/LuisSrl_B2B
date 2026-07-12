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
    ragioneSociale: string | null;
    indirizzo: string | null;
    cap: string | null;
    citta: string | null;
    provincia: string | null;
    flagSpedizione: boolean;
    codicePorto: string | null;
    codiceVettore: string | null;
  }>;
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
  const [porto, setPorto] = useState<string>("");
  const [spedizione, setSpedizione] = useState<string>("");
  const [vettore, setVettore] = useState<string>("--");
  const [notaSpedizione, setNotaSpedizione] = useState("");
  const [notaOrdine, setNotaOrdine] = useState("");

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
      setSpedizione(d.cliente.codiceSpedizione || "");
      setVettore(vettDef);
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
      const res = await api.post<OrdineConfermato>("/api/checkout/conferma", {
        indirizzoSpedizioneId: indirizzoId ?? undefined,
        codicePorto: porto || undefined,
        codiceSpedizione: spedizione || undefined,
        codiceVettore: vettore || undefined,
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
              {/* Sede di spedizione */}
              <section className="checkout-section">
                <h2 className="checkout-section-title">Sede di spedizione</h2>
                {dati.indirizzi.length === 0 ? (
                  <p className="checkout-note">
                    Nessun indirizzo salvato. La merce verrà inviata alla sede dell'anagrafica;
                    porto e vettore possono essere selezionati qui sotto.
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
                        {a.flagSpedizione && <span className="addr-default">Predefinita</span>}
                      </label>
                    ))}
                  </div>
                )}
              </section>

              {/* Porto / Spedizione / Vettore */}
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
                  <div className="form-field">
                    <label htmlFor="spedizione">Spedizione</label>
                    <select
                      id="spedizione"
                      className="form-select"
                      value={spedizione}
                      onChange={(e) => setSpedizione(e.target.value)}
                    >
                      {dati.spedizioni.map((s) => (
                        <option key={s.codice} value={s.codice}>{s.codice} — {s.descrizione}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="vettore">Vettore</label>
                    <select
                      id="vettore"
                      className="form-select"
                      value={vettore}
                      onChange={(e) => setVettore(e.target.value)}
                    >
                      {dati.vettori.map((v) => (
                        <option key={v.codice} value={v.codice}>{v.codice} — {v.descrizione}</option>
                      ))}
                    </select>
                  </div>
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
              {submitError && <p className="checkout-error">{submitError}</p>}
              <button
                className="btn btn-primary checkout-btn"
                disabled={submitting}
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
