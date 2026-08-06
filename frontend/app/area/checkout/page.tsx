"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/use-auth";
import { api, ApiError } from "../../../lib/api";
import LoadingScreen from "../../../components/common/LoadingScreen";
import ComboboxField from "../../../components/admin/ComboboxField";
import type { ComboboxOption } from "../../../components/admin/ComboboxField";

interface CartItem {
  id: number;
  varianteCodice: string;
  quantita: number;
  salvato: boolean;
  articoloNome: string | null;
  varianteDescrizione: string | null;
  dimensioni: string;
  immagineUrl: string | null;
  multiplo: number;
  prezzo: { prezzoNetto: number; prezzoListino: number; scontoListino?: number; sconto?: number } | null;
}

type ModalitaConsegna = "RITIRO" | "SPEDIZIONE";

interface Indirizzo {
  id: number;
  ragioneSociale: string | null;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  tipoDestinazione: string | null;
  flagSpedizione: boolean;
  flagAbituale: boolean;
  tipo: string | null;
  abituale: boolean;
  daIntegra: boolean;
}

interface DatiCheckout {
  cliente: {
    id: number;
    ragioneSociale: string | null;
    indirizzo: string | null;
    cap: string | null;
    citta: string | null;
    provincia: string | null;
    codicePagamento: string | null;
  };
  indirizzi: Indirizzo[];
  pagamenti: Array<{ codice: string; descrizione: string }>;
  allowNewAddress: boolean;
}

interface ShippingResult {
  importo: number;
  descrizione: string;
  gratuita: boolean;
}

interface OrdineConfermato {
  id: number;
  numeroOrdine: string;
  importoTotale: number;
}

const PROVINCE_OPTS: ComboboxOption[] = [
  { value:"AG",label:"Agrigento"},{ value:"AL",label:"Alessandria"},{ value:"AN",label:"Ancona"},{ value:"AO",label:"Aosta"},
  { value:"AR",label:"Arezzo"},{ value:"AP",label:"Ascoli Piceno"},{ value:"AT",label:"Asti"},{ value:"AV",label:"Avellino"},
  { value:"BA",label:"Bari"},{ value:"BT",label:"Barletta-Andria-Trani"},{ value:"BL",label:"Belluno"},{ value:"BN",label:"Benevento"},
  { value:"BG",label:"Bergamo"},{ value:"BI",label:"Biella"},{ value:"BO",label:"Bologna"},{ value:"BZ",label:"Bolzano"},
  { value:"BS",label:"Brescia"},{ value:"BR",label:"Brindisi"},{ value:"CA",label:"Cagliari"},{ value:"CL",label:"Caltanissetta"},
  { value:"CB",label:"Campobasso"},{ value:"CE",label:"Caserta"},{ value:"CT",label:"Catania"},{ value:"CZ",label:"Catanzaro"},
  { value:"CH",label:"Chieti"},{ value:"CO",label:"Como"},{ value:"CS",label:"Cosenza"},{ value:"CR",label:"Cremona"},
  { value:"KR",label:"Crotone"},{ value:"CN",label:"Cuneo"},{ value:"EN",label:"Enna"},{ value:"FM",label:"Fermo"},
  { value:"FE",label:"Ferrara"},{ value:"FI",label:"Firenze"},{ value:"FG",label:"Foggia"},{ value:"FC",label:"Forlì-Cesena"},
  { value:"FR",label:"Frosinone"},{ value:"GE",label:"Genova"},{ value:"GO",label:"Gorizia"},{ value:"GR",label:"Grosseto"},
  { value:"IM",label:"Imperia"},{ value:"IS",label:"Isernia"},{ value:"SP",label:"La Spezia"},{ value:"AQ",label:"L'Aquila"},
  { value:"LT",label:"Latina"},{ value:"LE",label:"Lecce"},{ value:"LC",label:"Lecco"},{ value:"LI",label:"Livorno"},
  { value:"LO",label:"Lodi"},{ value:"LU",label:"Lucca"},{ value:"MC",label:"Macerata"},{ value:"MN",label:"Mantova"},
  { value:"MS",label:"Massa-Carrara"},{ value:"MT",label:"Matera"},{ value:"ME",label:"Messina"},{ value:"MI",label:"Milano"},
  { value:"MO",label:"Modena"},{ value:"MB",label:"Monza e Brianza"},{ value:"NA",label:"Napoli"},{ value:"NO",label:"Novara"},
  { value:"NU",label:"Nuoro"},{ value:"OR",label:"Oristano"},{ value:"PD",label:"Padova"},{ value:"PA",label:"Palermo"},
  { value:"PR",label:"Parma"},{ value:"PV",label:"Pavia"},{ value:"PG",label:"Perugia"},{ value:"PU",label:"Pesaro e Urbino"},
  { value:"PE",label:"Pescara"},{ value:"PC",label:"Piacenza"},{ value:"PI",label:"Pisa"},{ value:"PT",label:"Pistoia"},
  { value:"PN",label:"Pordenone"},{ value:"PZ",label:"Potenza"},{ value:"PO",label:"Prato"},{ value:"RG",label:"Ragusa"},
  { value:"RA",label:"Ravenna"},{ value:"RC",label:"Reggio Calabria"},{ value:"RE",label:"Reggio Emilia"},{ value:"RI",label:"Rieti"},
  { value:"RN",label:"Rimini"},{ value:"RM",label:"Roma"},{ value:"RO",label:"Rovigo"},{ value:"SA",label:"Salerno"},
  { value:"SS",label:"Sassari"},{ value:"SV",label:"Savona"},{ value:"SI",label:"Siena"},{ value:"SR",label:"Siracusa"},
  { value:"SO",label:"Sondrio"},{ value:"SU",label:"Sud Sardegna"},{ value:"TA",label:"Taranto"},{ value:"TE",label:"Teramo"},
  { value:"TR",label:"Terni"},{ value:"TO",label:"Torino"},{ value:"TP",label:"Trapani"},{ value:"TN",label:"Trento"},
  { value:"TV",label:"Treviso"},{ value:"TS",label:"Trieste"},{ value:"UD",label:"Udine"},{ value:"VA",label:"Varese"},
  { value:"VE",label:"Venezia"},{ value:"VB",label:"Verbano-Cusio-Ossola"},{ value:"VC",label:"Vercelli"},{ value:"VR",label:"Verona"},
  { value:"VV",label:"Vibo Valentia"},{ value:"VI",label:"Vicenza"},{ value:"VT",label:"Viterbo"},
];

function fmtEur(n: number): string {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
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

  const [showNuovo, setShowNuovo] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState<number | null>(null);
  const [nRagione, setNRagione] = useState("");
  const [nIndirizzo, setNIndirizzo] = useState("");
  const [nCap, setNCap] = useState("");
  const [nCitta, setNCitta] = useState("");
  const [nProvincia, setNProvincia] = useState("");
  const [nDefault, setNDefault] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("");
  const [bankData, setBankData] = useState<{ intestatario: string; nome: string; iban: string; swift: string } | null>(null);

  const [spedizione, setSpedizione] = useState<ShippingResult>({ importo: 0, descrizione: "", gratuita: false });
  const [couponCode, setCouponCode] = useState("");
  const [couponActive, setCouponActive] = useState(false);
  const [couponValue, setCouponValue] = useState(0);
  const [couponIsPct, setCouponIsPct] = useState(false);
  const [couponMsg, setCouponMsg] = useState("");

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
      const active = (c.items ?? []).filter(i => !i.salvato);
      setItems(active);
      const def = d.indirizzi.find(i => i.abituale) ?? d.indirizzi[0] ?? null;
      setIndirizzoId(def ? def.id : (d.cliente.indirizzo ? -1 : null));
      setPaymentMethod(d.cliente.codicePagamento ?? d.pagamenti[0]?.codice ?? "");
      setModalita("SPEDIZIONE");
      try { setBankData(await api.get<any>("/api/config/banca-luis")); } catch {}
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "errors.generic");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && user) fetchAll();
  }, [authLoading, user, fetchAll]);

  const sedeLegale: Indirizzo | null = useMemo(() => {
    if (!dati?.cliente.citta && !dati?.cliente.indirizzo) return null;
    return {
      id: -1, ragioneSociale: null, indirizzo: dati.cliente.indirizzo, cap: dati.cliente.cap, citta: dati.cliente.citta,
      provincia: dati.cliente.provincia, tipoDestinazione: "SEDE_LEGALE", flagSpedizione: false, flagAbituale: false,
      tipo: "SEDE_LEGALE", abituale: false, daIntegra: true,
    };
  }, [dati]);

  const indirizzoSelezionato = useMemo(() => {
    if (indirizzoId === -1) return sedeLegale;
    return dati?.indirizzi.find(i => i.id === indirizzoId) ?? null;
  }, [dati, indirizzoId, sedeLegale]);

  const tuttiIndirizzi = useMemo(() => {
    if (!dati) return [];
    return sedeLegale ? [sedeLegale, ...dati.indirizzi] : dati.indirizzi;
  }, [dati, sedeLegale]);

  function selezionaIndirizzo(id: number) { setIndirizzoId(id); }

  const subtotalQty = items.reduce((s, i) => s + i.quantita, 0);
  const subtotalAmount = items.reduce((s, i) => s + i.quantita * (i.prezzo?.prezzoNetto ?? 0), 0);
  const subtotalListino = items.reduce((s, i) => s + i.quantita * (i.prezzo?.prezzoListino ?? 0), 0);

  useEffect(() => {
    if (!indirizzoSelezionato?.provincia) return;
    api.get<ShippingResult>(`/api/checkout/spedizione?provincia=${indirizzoSelezionato.provincia}&imponibile=${subtotalAmount}`)
      .then(setSpedizione).catch(() => setSpedizione({ importo: 0, descrizione: "", gratuita: false }));
  }, [indirizzoSelezionato?.provincia, subtotalAmount]);

  const couponDiscount = couponActive ? (couponIsPct ? subtotalAmount * couponValue : couponValue) : 0;
  const subScontato = subtotalAmount - couponDiscount;
  const isRitiro = modalita === "RITIRO";
  const spedizioneFee = isRitiro ? 0 : (spedizione?.importo ?? 0);
  const totale = subScontato + spedizioneFee;

  async function applyCoupon() {
    setCouponMsg("");
    if (!couponCode.trim()) return;
    if (couponCode === "B2B10") { setCouponActive(true); setCouponValue(0.10); setCouponIsPct(true); setCouponMsg("Codice applicato: −10%"); }
    else if (couponCode === "B2B20") { setCouponActive(true); setCouponValue(0.20); setCouponIsPct(true); setCouponMsg("Codice applicato: −20%"); }
    else if (couponCode === "SPRING50") { setCouponActive(true); setCouponValue(50); setCouponIsPct(false); setCouponMsg("Codice applicato: −50 €"); }
    else { setCouponMsg("Codice non valido"); setCouponActive(false); }
  }

  function removeCoupon() { setCouponActive(false); setCouponValue(0); setCouponMsg(""); setCouponCode(""); }

  function openNuovoForm() {
    setShowNuovo(true); setEditingAddrId(null);
    setNRagione(""); setNIndirizzo(""); setNCap(""); setNCitta(""); setNProvincia(""); setNDefault(false);
  }

  function openEditForm(a: Indirizzo) {
    setShowNuovo(true); setEditingAddrId(a.id);
    setNRagione(a.ragioneSociale ?? "");
    setNIndirizzo(a.indirizzo ?? "");
    setNCap(a.cap ?? "");
    setNCitta(a.citta ?? "");
    setNProvincia(a.provincia ?? "");
    setNDefault(a.abituale);
  }

  function closeNuovoForm() {
    setShowNuovo(false); setEditingAddrId(null);
    setNRagione(""); setNIndirizzo(""); setNCap(""); setNCitta(""); setNProvincia(""); setNDefault(false);
  }

  async function saveIndirizzo() {
    if (!nIndirizzo.trim() || !nCap.trim() || !nCitta.trim()) return;
    try {
      if (editingAddrId) {
        await api.put(`/api/checkout/indirizzo/${editingAddrId}`, {
          ragioneSociale: nRagione || undefined, indirizzo: nIndirizzo.trim(), cap: nCap.trim(),
          citta: nCitta.trim(), provincia: nProvincia || undefined, abituale: nDefault,
        });
      } else {
        await api.post("/api/checkout/indirizzo", {
          ragioneSociale: nRagione || undefined, indirizzo: nIndirizzo.trim(), cap: nCap.trim(),
          citta: nCitta.trim(), provincia: nProvincia || undefined, abituale: nDefault,
        });
      }
    } catch {}
    // Reload from API
    try {
      const d = await api.get<DatiCheckout>("/api/checkout/dati");
      setDati(d);
    } catch {}
    closeNuovoForm();
  }

  async function conferma() {
    if (!dati) return;
    setSubmitting(true); setSubmitError(null);
    try {
      const nuovoIndirizzo = showNuovo && !editingAddrId && nIndirizzo.trim() && nCap.trim() && nCitta.trim()
        ? { ragioneSociale: nRagione || undefined, indirizzo: nIndirizzo.trim(), cap: nCap.trim(), citta: nCitta.trim(), provincia: nProvincia || undefined, abituale: nDefault }
        : undefined;
      const res = await api.post<OrdineConfermato>("/api/checkout/conferma", {
        modalitaConsegna: modalita, indirizzoSpedizioneId: isRitiro ? undefined : indirizzoId && indirizzoId !== -1 ? indirizzoId : undefined,
        nuovoIndirizzo, codicePagamento: paymentMethod || undefined,
        notaSpedizione: notaSpedizione || undefined, notaOrdine: notaOrdine || undefined,
      });
      setConfermato(res);
      window.dispatchEvent(new CustomEvent("cart-updated"));
    } catch (e) { setSubmitError(e instanceof ApiError ? e.code : "errors.generic"); }
    setSubmitting(false);
  }

  async function copyIban() {
    const iban = bankData?.iban?.replace(/\s/g, "") ?? "";
    try { await navigator.clipboard.writeText(iban); } catch {}
  }

  if (authLoading || !user || user.userType !== "customer") return <LoadingScreen />;

  if (confermato) {
    return (
      <div className="catalogo-page cart-page checkout-page">
        <main id="content"><div className="container">
          <div className="checkout-confirm">
            <div className="checkout-confirm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            <h1>Ordine inviato</h1>
            <p className="checkout-confirm-sub">Ordine <strong>{confermato.numeroOrdine}</strong> creato con successo.</p>
            <div className="checkout-confirm-total"><span>Totale (IVA esclusa)</span><strong>{fmtEur(confermato.importoTotale)}</strong></div>
            <div className="checkout-confirm-actions">
              <Link href="/area/catalogo" className="btn btn-primary">Continua lo shopping</Link>
              <Link href="/area" className="btn btn-secondary">Area personale</Link>
            </div>
          </div>
        </div></main>
      </div>
    );
  }

  if (loading) return <div className="catalogo-page cart-page"><main id="content"><div className="container" style={{ paddingBlock: 48, color: "var(--muted)" }}>Caricamento…</div></main></div>;

  if (error || !dati) return (
    <div className="catalogo-page cart-page"><main id="content"><div className="container" style={{ paddingBlock: 48, textAlign: "center" }}>
      <p style={{ color: "var(--muted)", marginBottom: 20 }}>Impossibile caricare i dati di checkout.</p>
      <Link href="/area/carrello" className="btn btn-primary">Torna al carrello</Link>
    </div></main></div>
  );

  if (items.length === 0) return (
    <div className="catalogo-page cart-page"><main id="content"><div className="container" style={{ paddingBlock: 48, textAlign: "center" }}>
      <p style={{ color: "var(--muted)", marginBottom: 20 }}>Il carrello è vuoto.</p>
      <Link href="/area/catalogo" className="btn btn-primary">Continua lo shopping</Link>
    </div></main></div>
  );

  return (
    <div className="catalogo-page cart-page checkout-page">
      <main id="content"><div className="container">
        <div className="page-title"><h1>Checkout</h1></div>
        <div className="checkout-layout">
          <div className="checkout-form">

            {/* Condizioni di pagamento */}
            <section className="checkout-section">
              <h2 className="checkout-section-title">Condizioni di pagamento</h2>
              <p className="checkout-note" style={{ marginBottom: 12 }}>Modalità di pagamento ricevuta da Integra.</p>
              <div className="form-field" style={{ marginBottom: 14 }}>
                <label>Pagamento</label>
                <select className="form-select" style={{ width: "100%" }} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  {dati.pagamenti.map(p => (<option key={p.codice} value={p.codice}>{p.codice} — {p.descrizione}</option>))}
                </select>
              </div>
              {bankData && paymentMethod === "ANT" && (
                <div className="form-field">
                  <label>Coordinate bancarie LUIS S.r.l.</label>
                  <p className="checkout-note" style={{ marginBottom: 8 }}>Effettuare il bonifico alle seguenti coordinate. L&apos;ordine sarà evaso a pagamento ricevuto.</p>
                  <div className="iban-row">
                    <div className="read-only-field iban-field">
                      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 2 }}>Intestatario: {bankData.intestatario}</div>
                      <div style={{ fontSize: 14, marginBottom: 1 }}>{bankData.iban}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{bankData.nome} — SWIFT {bankData.swift}</div>
                    </div>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={copyIban}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      Copia IBAN
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Modalità di consegna */}
            <section className="checkout-section">
              <h2 className="checkout-section-title">Modalità di consegna</h2>
              <div className="opt-list">
                <label className={"opt-card" + (modalita === "RITIRO" ? " selected" : "")}>
                  <input type="radio" name="modalita" checked={modalita === "RITIRO"} onChange={() => setModalita("RITIRO")} />
                  <span className="opt-main"><span className="opt-name">Ritiro in sede</span><span className="opt-desc">Ritiri tu stesso la merce presso la nostra sede.</span></span>
                </label>
                <label className={"opt-card" + (modalita === "SPEDIZIONE" ? " selected" : "")}>
                  <input type="radio" name="modalita" checked={modalita === "SPEDIZIONE"} onChange={() => setModalita("SPEDIZIONE")} />
                  <span className="opt-main"><span className="opt-name">Spedizione corriere</span><span className="opt-desc">Consegnamo tramite vettore all&apos;indirizzo indicato.</span></span>
                </label>
              </div>
            </section>

            {/* Indirizzo di spedizione */}
            {!isRitiro && (
              <section className="checkout-section">
                <h2 className="checkout-section-title">Indirizzo di spedizione</h2>

                {tuttiIndirizzi.length === 0 && !showNuovo && (
                  <p className="checkout-note">Nessun indirizzo di spedizione salvato. La merce verrà inviata alla sede dell&apos;anagrafica.</p>
                )}

                {tuttiIndirizzi.length > 0 && (
                  <div className="addr-grid">
                    {tuttiIndirizzi.map(a => (
                      <label key={a.id} className={"addr-card" + (a.id === indirizzoId ? " selected" : "")} style={{ cursor: "pointer" }}>
                        <input type="radio" name="indirizzo" checked={a.id === indirizzoId} onChange={() => selezionaIndirizzo(a.id)} style={{ position: "absolute", opacity: 0 }} />
                        <div className="addr-card-h">
                          <span className={`status ${a.tipoDestinazione === "SPEDIZIONE" ? "st-amber" : "st-blue"}`}>
                            <span className="sd">●</span>
                            {a.id === -1 ? "Sede legale"
                             : a.tipoDestinazione === "SEDE_LEGALE" || a.tipoDestinazione === "SEDE" ? "Sede legale"
                             : a.tipoDestinazione === "SPEDIZIONE" ? "Spedizione"
                             : a.tipoDestinazione === "FILIALE" ? "Filiale"
                             : a.ragioneSociale ?? a.tipoDestinazione ?? "Filiale"}
                          </span>
                          {a.ragioneSociale && a.id !== -1 && <div className="addr-card-title">{a.ragioneSociale}</div>}
                        </div>
                        <div className="addr-l"><b>Indirizzo</b><span>{a.indirizzo || "—"}</span></div>
                        <div className="addr-l"><b>CAP</b><span className="mono">{a.cap || "—"}</span></div>
                        <div className="addr-l"><b>Città</b><span>{a.citta || "—"}</span></div>
                        <div className="addr-l"><b>Provincia</b><span className="mono">{a.provincia || "—"}</span></div>
                        {a.abituale && <span className="addr-badge">Predefinito</span>}
                        {a.id !== -1 && !a.daIntegra && (
                          <>
                            <button type="button" className="addr-edit-btn" onClick={e => { e.stopPropagation(); openEditForm(a); }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button type="button" className="addr-edit-btn" style={{ right: 40, color: "var(--red)" }}
                              onClick={async e => {
                                e.stopPropagation();
                                try { await api.del(`/api/checkout/indirizzo/${a.id}`); } catch {}
                                const updated = dati!.indirizzi.filter(x => x.id !== a.id);
                                setDati({ ...dati!, indirizzi: updated });
                                if (indirizzoId === a.id) setIndirizzoId(updated[0]?.id ?? -1);
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                          </>
                        )}
                        {a.id !== -1 && !a.abituale && (
                          <button type="button" className="btn-set-default" onClick={e => {
                            e.stopPropagation();
                            const updated = tuttiIndirizzi.map(addr => ({ ...addr, abituale: addr.id === a.id }));
                            setDati({ ...dati!, indirizzi: updated.filter(x => x.id !== -1) });
                            setIndirizzoId(a.id);
                          }}>Imposta come predefinito</button>
                        )}
                      </label>
                    ))}
                  </div>
                )}

                {dati.allowNewAddress && !showNuovo && (
                  <button type="button" className="btn btn-secondary addr-add-btn" onClick={openNuovoForm}>+ Indica un nuovo indirizzo</button>
                )}

                {showNuovo && (
                  <div className="addr-new">
                    <div className="checkout-grid">
                      <div className="form-field">
                        <label htmlFor="nRagione">Intestazione</label>
                        <input id="nRagione" className="form-input" value={nRagione} onChange={e => setNRagione(e.target.value)} placeholder="Es. Nome destinatario" />
                      </div>
                      <div className="form-field">
                        <label htmlFor="nIndirizzo">Indirizzo *</label>
                        <input id="nIndirizzo" className="form-input" value={nIndirizzo} onChange={e => setNIndirizzo(e.target.value)} />
                      </div>
                      <div className="form-field">
                        <label htmlFor="nCap">CAP *</label>
                        <input id="nCap" className="form-input" value={nCap} onChange={e => setNCap(e.target.value)} />
                      </div>
                      <div className="form-field">
                        <label htmlFor="nCitta">Città *</label>
                        <input id="nCitta" className="form-input" value={nCitta} onChange={e => setNCitta(e.target.value)} />
                      </div>
                      <div className="form-field">
                        <label htmlFor="nProvincia">Provincia</label>
                        <ComboboxField value={nProvincia} onChange={v => setNProvincia(v)} options={PROVINCE_OPTS} allowAuto={false} placeholder="Cerca provincia..." />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--fg)", cursor: "pointer" }}>
                        <input type="checkbox" checked={nDefault} onChange={e => setNDefault(e.target.checked)} style={{ accentColor: "var(--accent)", width: 15, height: 15 }} />
                        Imposta come predefinito
                      </label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={closeNuovoForm}>Annulla</button>
                        <button type="button" className="btn btn-primary btn-sm" onClick={saveIndirizzo}>
                          {editingAddrId ? "Aggiorna" : "Salva indirizzo"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Note */}
            <section className="checkout-section">
              <h2 className="checkout-section-title">Note</h2>
              <div className="checkout-grid">
                <div className="form-field">
                  <label htmlFor="notaSpedizione">Nota di spedizione</label>
                  <textarea id="notaSpedizione" className="form-textarea" rows={3} value={notaSpedizione} onChange={e => setNotaSpedizione(e.target.value)} placeholder="Es. consegna al piano, orari preferiti…" />
                </div>
                <div className="form-field">
                  <label htmlFor="notaOrdine">Nota d&apos;ordine</label>
                  <textarea id="notaOrdine" className="form-textarea" rows={3} value={notaOrdine} onChange={e => setNotaOrdine(e.target.value)} placeholder="Es. riferimento commessa interna…" />
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar: riepilogo ordine */}
          <aside className="order-summary checkout-summary">
            <h2>Riepilogo ordine</h2>

            {!isRitiro && indirizzoSelezionato && (
              <div className="summary-ship">
                <span className="label">Spedizione a</span>
                <span className="value">{indirizzoSelezionato.ragioneSociale ?? "Sede"}</span>
                <span className="summary-ship-line">{[indirizzoSelezionato.indirizzo, indirizzoSelezionato.cap, indirizzoSelezionato.citta, indirizzoSelezionato.provincia].filter(Boolean).join(" ")}</span>
              </div>
            )}

            <div className="summary-rows">
              {items.map(item => {
                const tot = item.quantita * (item.prezzo?.prezzoNetto ?? 0);
                const scontoPct = item.prezzo?.sconto ?? item.prezzo?.scontoListino ?? 0;
                return (
                  <div key={item.varianteCodice} className="summary-item">
                    <div className="summary-item-row1">
                      <span className="badge code">{item.varianteCodice}</span>
                      <span className="desc">{item.articoloNome ?? item.varianteCodice}</span>
                    </div>
                    <div className="summary-item-row2">
                      <span className="listino">{fmtEur(item.prezzo?.prezzoListino ?? 0)}</span>
                      {scontoPct > 0 && <span className="sconto">−{scontoPct}%</span>}
                      <span className="riga">{item.quantita} × {fmtEur(item.prezzo?.prezzoNetto ?? 0)}</span>
                      <span className="netto">{fmtEur(tot)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <hr className="summary-divider" />

            <table className="total-table">
              <tbody>
                <tr><td>Totale articoli a listino</td><td>{fmtEur(subtotalListino)}</td></tr>
                <tr><td colSpan={2} style={{ padding: "4px 0 0" }}>
                  <div className="coupon-row">
                    <input type="text" className="coupon-input" placeholder="Codice sconto" value={couponCode} onChange={e => setCouponCode(e.target.value)} autoComplete="off" />
                    <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: 12, padding: "5px 10px" }} onClick={applyCoupon}>Applica</button>
                    {couponActive && <button type="button" className="coupon-remove" onClick={removeCoupon}>×</button>}
                    {couponMsg && <span className={`coupon-msg ${couponActive ? "ok" : "err"}`} style={{ fontSize: 11 }}>{couponMsg}</span>}
                  </div>
                </td></tr>
                {couponActive && <tr className="discount"><td>Sconto codice</td><td>−{fmtEur(couponDiscount)}</td></tr>}
                <tr><td colSpan={2}><hr className="total-divider" /></td></tr>
                <tr className="bold"><td>Subtotale scontato</td><td>{fmtEur(subScontato)}</td></tr>
                <tr className="bold"><td>Spedizione</td>
                  <td style={spedizione?.gratuita ? { color: "var(--green)" } : undefined}>
                    {isRitiro ? "0,00 €" : spedizione?.gratuita ? "Gratuita" : fmtEur(spedizione?.importo ?? 0)}
                  </td>
                </tr>
                <tr><td colSpan={2}><hr className="total-divider" /></td></tr>
                <tr className="final"><td>Totale (IVA esclusa)</td><td>{fmtEur(totale)}</td></tr>
              </tbody>
            </table>

            {submitError && <div className="checkout-error">{submitError}</div>}
            <button className="btn btn-primary checkout-btn" disabled={submitting} onClick={conferma}>
              {submitting ? "Invio in corso…" : "Conferma ordine"}
            </button>
            <Link href="/area/carrello" className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>Torna al carrello</Link>
          </aside>
        </div>
      </div></main>
    </div>
  );
}
