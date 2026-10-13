"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";

interface DatiFatturazione {
  ragioneSociale: string;
  partitaIva: string | null;
  codiceFiscale: string | null;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  codiceSdi: string | null;
  pec: string | null;
}
interface Risposta { richiesta: boolean; confermatiIl: string | null; dati: DatiFatturazione }

const MESSAGGI: Record<string, string> = {
  "fatturazione.sdi_o_pec": "Indica il codice destinatario SDI oppure la PEC.",
  "fatturazione.pec_obbligatoria": "Con codice SDI 0000000 la PEC è obbligatoria.",
  "validation.cap": "Il CAP deve avere 5 cifre.",
  "validation.provincia": "Indica la sigla della provincia (2 lettere, es. BG).",
  "validation.sdi": "Il codice SDI ha 7 caratteri (lettere e numeri).",
  "validation.pec": "La PEC non è un indirizzo email valido.",
  "validation.cf": "Il codice fiscale deve avere 11 cifre o 16 caratteri.",
};

/**
 * Conferma dei dati di fatturazione elettronica al primo ordine (clienti nati da una richiesta vetrina).
 * Mostrata solo se il backend la richiede; l'ordine e' bloccato anche lato server finche' non e' confermata.
 */
export default function FatturazioneCheckout({ onRichiesta }: { onRichiesta: (richiesta: boolean) => void }) {
  const [stato, setStato] = useState<Risposta | null>(null);
  const [form, setForm] = useState<DatiFatturazione | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    api.get<Risposta>("/api/checkout/fatturazione")
      .then((r) => { setStato(r); setForm(r.dati); onRichiesta(r.richiesta); })
      .catch(() => onRichiesta(false)); // in caso di errore decide il controllo lato server
  }, [onRichiesta]);

  if (!stato || !form || !stato.richiesta) return null;

  const set = (k: keyof DatiFatturazione) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function conferma(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSalvando(true); setErrore(null);
    try {
      const r = await api.put<Risposta>("/api/checkout/fatturazione", {
        ragioneSociale: form.ragioneSociale,
        codiceFiscale: form.codiceFiscale || undefined,
        indirizzo: form.indirizzo ?? "",
        cap: form.cap ?? "",
        citta: form.citta ?? "",
        provincia: form.provincia ?? "",
        codiceSdi: form.codiceSdi || undefined,
        pec: form.pec || undefined,
      });
      setStato(r); setForm(r.dati); onRichiesta(r.richiesta);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "errors.generic";
      setErrore(MESSAGGI[code] ?? "Impossibile salvare i dati. Controlla i campi e riprova.");
    }
    setSalvando(false);
  }

  return (
    <section className="checkout-section">
      <h2 className="checkout-section-title">Dati di fatturazione</h2>
      <p className="checkout-note" style={{ marginBottom: 14 }}>
        Prima del primo ordine conferma i dati per la fatturazione elettronica. Puoi indicare il{" "}
        <strong>codice destinatario SDI</strong> oppure la <strong>PEC</strong>.
      </p>
      <form onSubmit={conferma}>
        <div className="checkout-grid">
          <div className="form-field">
            <label htmlFor="f-rs">Ragione sociale</label>
            <input id="f-rs" className="form-input" required minLength={2} maxLength={200} value={form.ragioneSociale} onChange={set("ragioneSociale")} />
          </div>
          <div className="form-field">
            <label>Partita IVA</label>
            <div className="read-only-field">{form.partitaIva || "—"}</div>
            <span className="form-hint">Non modificabile. Per correzioni contatta shop@luisbg.it.</span>
          </div>
          <div className="form-field">
            <label htmlFor="f-cf">Codice fiscale</label>
            <input id="f-cf" className="form-input" maxLength={16} pattern="[0-9]{11}|[A-Za-z0-9]{16}" value={form.codiceFiscale ?? ""} onChange={set("codiceFiscale")} placeholder="Se diverso dalla P.IVA" />
          </div>
          <div className="form-field">
            <label htmlFor="f-ind">Indirizzo sede legale</label>
            <input id="f-ind" className="form-input" required minLength={3} maxLength={120} value={form.indirizzo ?? ""} onChange={set("indirizzo")} />
          </div>
          <div className="form-field">
            <label htmlFor="f-cap">CAP</label>
            <input id="f-cap" className="form-input" required pattern="[0-9]{5}" inputMode="numeric" maxLength={5} value={form.cap ?? ""} onChange={set("cap")} />
          </div>
          <div className="form-field">
            <label htmlFor="f-citta">Città</label>
            <input id="f-citta" className="form-input" required minLength={2} maxLength={80} value={form.citta ?? ""} onChange={set("citta")} />
          </div>
          <div className="form-field">
            <label htmlFor="f-prov">Provincia</label>
            <input id="f-prov" className="form-input" required pattern="[A-Za-z]{2}" maxLength={2} value={form.provincia ?? ""} onChange={set("provincia")} placeholder="es. BG" />
          </div>
          <div className="form-field">
            <label htmlFor="f-sdi">Codice destinatario SDI</label>
            <input id="f-sdi" className="form-input" pattern="[A-Za-z0-9]{7}" maxLength={7} value={form.codiceSdi ?? ""} onChange={set("codiceSdi")} placeholder="7 caratteri" />
          </div>
          <div className="form-field">
            <label htmlFor="f-pec">PEC</label>
            <input id="f-pec" className="form-input" type="email" maxLength={200} value={form.pec ?? ""} onChange={set("pec")} placeholder="fatture@pec.azienda.it" />
          </div>
        </div>
        {errore && <div className="checkout-error" role="alert">{errore}</div>}
        <button type="submit" className="btn btn-primary" disabled={salvando} style={{ marginTop: 12 }}>
          {salvando ? "Salvataggio…" : "Conferma dati di fatturazione"}
        </button>
      </form>
    </section>
  );
}
