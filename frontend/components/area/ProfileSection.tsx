"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { CustomerProfile } from "../../lib/types";
import { api, ApiError } from "../../lib/api";
import ComboboxField from "../admin/ComboboxField";
import IndirizzoEditorModal from "./IndirizzoEditorModal";
import Modal from "../common/Modal";

function BuildingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><line x1="8" y1="6" x2="10" y2="6" /><line x1="16" y1="6" x2="18" y2="6" /><line x1="8" y1="10" x2="10" y2="10" /><line x1="16" y1="10" x2="18" y2="10" /><line x1="8" y1="14" x2="10" y2="14" /><line x1="16" y1="14" x2="18" y2="14" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

interface Indirizzo {
  id: number;
  ragioneSociale: string | null;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  tipoDestinazione: string | null;
  abituale: boolean;
  daIntegra: boolean;
}

const PROVINCE_OPTS = [
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

const NAZIONI_OPTS = [
  { value: "IT", label: "Italia (Europa)" },
  { value: "AT", label: "Austria (Europa)" },
  { value: "BE", label: "Belgio (Europa)" },
  { value: "BG", label: "Bulgaria (Europa)" },
  { value: "CH", label: "Svizzera (Europa)" },
  { value: "CY", label: "Cipro (Europa)" },
  { value: "CZ", label: "Rep. Ceca (Europa)" },
  { value: "DE", label: "Germania (Europa)" },
  { value: "DK", label: "Danimarca (Europa)" },
  { value: "EE", label: "Estonia (Europa)" },
  { value: "ES", label: "Spagna (Europa)" },
  { value: "FI", label: "Finlandia (Europa)" },
  { value: "FR", label: "Francia (Europa)" },
  { value: "GB", label: "Regno Unito (Europa)" },
  { value: "GR", label: "Grecia (Europa)" },
  { value: "HR", label: "Croazia (Europa)" },
  { value: "HU", label: "Ungheria (Europa)" },
  { value: "IE", label: "Irlanda (Europa)" },
  { value: "LT", label: "Lituania (Europa)" },
  { value: "LU", label: "Lussemburgo (Europa)" },
  { value: "LV", label: "Lettonia (Europa)" },
  { value: "MT", label: "Malta (Europa)" },
  { value: "NL", label: "Paesi Bassi (Europa)" },
  { value: "PL", label: "Polonia (Europa)" },
  { value: "PT", label: "Portogallo (Europa)" },
  { value: "RO", label: "Romania (Europa)" },
  { value: "SE", label: "Svezia (Europa)" },
  { value: "SI", label: "Slovenia (Europa)" },
  { value: "SK", label: "Slovacchia (Europa)" },
  { value: "US", label: "Stati Uniti (America)" },
  { value: "CA", label: "Canada (America)" },
  { value: "BR", label: "Brasile (America)" },
  { value: "MX", label: "Messico (America)" },
  { value: "AR", label: "Argentina (America)" },
  { value: "JP", label: "Giappone (Asia)" },
  { value: "CN", label: "Cina (Asia)" },
  { value: "KR", label: "Corea del Sud (Asia)" },
  { value: "IN", label: "India (Asia)" },
  { value: "AU", label: "Australia (Oceania)" },
  { value: "NZ", label: "Nuova Zelanda (Oceania)" },
  { value: "MA", label: "Marocco (Africa)" },
  { value: "ZA", label: "Sud Africa (Africa)" },
  { value: "EG", label: "Egitto (Africa)" },
  { value: "AE", label: "Emirati Arabi (Asia)" },
  { value: "ROW", label: "Altro (Resto del mondo)" },
];

export default function ProfileSection({
  customer,
  onPasswordChanged,
}: {
  customer: CustomerProfile;
  onPasswordChanged: () => void;
}) {
  const t = useTranslations("area");
  const c = customer;
  const [pwOpen, setPwOpen] = useState(false);
  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwOk, setPwOk] = useState(false);

  const [indirizzi, setIndirizzi] = useState<Indirizzo[]>([]);
  const [addrLoaded, setAddrLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [fRagione, setFRagione] = useState("");
  const [fIndirizzo, setFIndirizzo] = useState("");
  const [fCap, setFCap] = useState("");
  const [fCitta, setFCitta] = useState("");
  const [fProvincia, setFProvincia] = useState("");
  const [fNazione, setFNazione] = useState("IT");
  const [fDefault, setFDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchIndirizzi = async () => {
    try {
      const d = await api.get<{ indirizzi: Indirizzo[] }>("/api/checkout/dati");
      setIndirizzi(d.indirizzi);
    } catch {}
    setAddrLoaded(true);
  };

  useEffect(() => { fetchIndirizzi(); }, []);

  // Indirizzo virtuale da anagrafica (sede legale), come nel checkout
  const sedeLegale: Indirizzo | null = (customer.indirizzo || customer.cap || customer.citta) ? {
    id: -1,
    ragioneSociale: customer.ragioneSociale ?? customer.nome,
    indirizzo: customer.indirizzo ?? null,
    cap: customer.cap ?? null,
    citta: customer.citta ?? null,
    provincia: customer.provincia ?? null,
    tipoDestinazione: "SEDE_LEGALE",
    abituale: !indirizzi.some(a => a.abituale),
    daIntegra: true,
  } : null;

  const tuttiIndirizzi = sedeLegale ? [sedeLegale, ...indirizzi] : indirizzi;

  function openNew() {
    setEditId(null); setFRagione(""); setFIndirizzo(""); setFCap(""); setFCitta(""); setFProvincia(""); setFNazione("IT"); setFDefault(false); setShowForm(true);
  }

  function openEdit(a: Indirizzo) {
    setEditId(a.id); setFRagione(a.ragioneSociale ?? ""); setFIndirizzo(a.indirizzo ?? ""); setFCap(a.cap ?? ""); setFCitta(a.citta ?? ""); setFProvincia(a.provincia ?? ""); setFNazione((a as any).nazione ?? "IT"); setFDefault(a.abituale); setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditId(null); }

  async function saveAddr() {
    if (!fIndirizzo.trim() || !fCap.trim() || !fCitta.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/api/checkout/indirizzo/${editId}`, { ragioneSociale: fRagione || undefined, indirizzo: fIndirizzo.trim(), cap: fCap.trim(), citta: fCitta.trim(), provincia: fProvincia || undefined, nazione: fNazione, abituale: fDefault });
      } else {
        await api.post("/api/checkout/indirizzo", { ragioneSociale: fRagione || undefined, indirizzo: fIndirizzo.trim(), cap: fCap.trim(), citta: fCitta.trim(), provincia: fProvincia || undefined, nazione: fNazione, abituale: fDefault });
      }
      closeForm();
      await fetchIndirizzi();
    } catch {}
    setSaving(false);
    window.dispatchEvent(new CustomEvent("address-updated"));
  }

  async function deleteAddr(id: number) {
    try { await api.del(`/api/checkout/indirizzo/${id}`); } catch {}
    await fetchIndirizzi();
    window.dispatchEvent(new CustomEvent("address-updated"));
  }

  async function setDefault(id: number) {
    if (id === -1) {
      try { await api.patch('/api/checkout/indirizzo/0/predefinito'); } catch {}
      await fetchIndirizzi();
      window.dispatchEvent(new CustomEvent("address-updated"));
      return;
    }
    try { await api.patch(`/api/checkout/indirizzo/${id}/predefinito`); } catch {}
    await fetchIndirizzi();
    window.dispatchEvent(new CustomEvent("address-updated"));
  }

  const handlePwSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (pwNew.length < 8) { setPwError("Minimo 8 caratteri."); return; }
    if (pwNew !== pwConfirm) { setPwError("Le password non coincidono."); return; }
    try {
      await api.post("/api/auth/change-password", { oldPassword: pwOld, newPassword: pwNew });
      setPwOk(true);
      onPasswordChanged();
      setTimeout(() => { setPwOpen(false); setPwOk(false); setPwOld(""); setPwNew(""); setPwConfirm(""); }, 1500);
    } catch (err) {
      setPwError(err instanceof ApiError ? err.code : "errors.generic");
    }
  };

  return (
    <>
      <h1>{t("profileTitle")}</h1>

      <div className="profile-grid">

        {/* Anagrafica */}
        <div className="profile-card">
          <h2><BuildingIcon /> Anagrafica</h2>

          {c.ragioneSociale && (
            <div className="profile-field">
              <label>{t("profileRagioneSociale")}</label>
              <div className="value">{c.ragioneSociale}</div>
            </div>
          )}

          {c.partitaIva && (
            <div className="profile-field">
              <label>{t("profilePiva")}</label>
              <div className="value">{c.partitaIva}</div>
            </div>
          )}

          {c.codiceCliente && (
            <div className="profile-field">
              <label>{t("profileCodiceCliente")}</label>
              <div className="value">{c.codiceCliente}</div>
            </div>
          )}

          <div className="profile-field">
            <label>{t("profileEmail")}</label>
            <div className="value readonly">{c.email}</div>
          </div>

          <div className="profile-field">
            <label>{t("profileReferente")}</label>
            <div className="value">{c.nome}</div>
          </div>

          <div className="profile-field">
            <label>{t("profileTelefono")}</label>
            <div className="value">{c.telefono || "—"}</div>
          </div>

          <div className="profile-field">
            <label>{t("profileTelefonoFisso")}</label>
            <div className="value">{c.telefonoFisso || "—"}</div>
          </div>

          <div className="profile-field">
            <label>{t("profileSitoWeb")}</label>
            <div className="value">
              {c.sitoWeb ? (
                <a href={c.sitoWeb.startsWith("http") ? c.sitoWeb : `https://${c.sitoWeb}`}
                   target="_blank" rel="noopener noreferrer"
                   style={{ color: "var(--accent)", textDecoration: "none" }}>
                  {c.sitoWeb}
                </a>
              ) : "—"}
            </div>
          </div>

          {c.codiceListino && (
            <div className="profile-field">
              <label>{t("profileListino")}</label>
              <div className="value readonly">{c.codiceListino}</div>
            </div>
          )}
        </div>

        {/* Indirizzi */}
        <div className="profile-card">
          <h2>{t("profileIndirizzi")} <span className="badge">{tuttiIndirizzi.length}</span></h2>
          {addrLoaded && tuttiIndirizzi.length === 0 && !showForm && (
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>Nessun indirizzo salvato.</p>
          )}
          {tuttiIndirizzi.map(a => (
            <div key={a.id} className="addr-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div>
                <strong>{a.ragioneSociale || "—"}</strong><br />
                <span className="meta">{a.indirizzo || "—"}</span><br />
                <span className="meta">{[a.cap, a.citta, a.provincia].filter(Boolean).join(" ")}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {a.abituale && <span className="tag" style={{ background: "color-mix(in oklch, var(--accent) 20%, transparent)" }}>Predefinito</span>}
                  {!a.abituale && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setDefault(a.id)} style={{ fontSize: 12 }}>Imposta predefinito</button>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {a.id !== -1 && !a.daIntegra && (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)} style={{ fontSize: 12 }}>Modifica</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => deleteAddr(a.id)} style={{ fontSize: 12, color: "var(--red)" }}>Elimina</button>
                    </>
                  )}
                  {a.id === -1 && <span className="tag" style={{ background: "color-mix(in oklch, var(--ok) 18%, transparent)", color: "var(--ok)" }}>Anagrafica</span>}
                </div>
              </div>
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" onClick={openNew} style={{ marginTop: 8 }}>+ Nuovo indirizzo</button>
          <IndirizzoEditorModal
            open={showForm}
            title={editId ? "Modifica indirizzo" : "Nuovo indirizzo"}
            initial={editId ? { ragioneSociale: fRagione, indirizzo: fIndirizzo, cap: fCap, citta: fCitta, provincia: fProvincia, nazione: fNazione, abituale: fDefault } : undefined}
            onSave={async (data) => {
              if (editId) {
                await api.put(`/api/checkout/indirizzo/${editId}`, data);
              } else {
                await api.post("/api/checkout/indirizzo", data);
              }
              closeForm();
              await fetchIndirizzi();
              window.dispatchEvent(new CustomEvent("address-updated"));
            }}
            onClose={closeForm}
          />
        </div>

        {/* Modalità di pagamento */}
        <div className="profile-card">
          <h2>{t("profilePagamento")} <span className="badge">1</span></h2>
          <div className="pay-item">
            <div className="icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M2 10h20"/></svg>
            </div>
            <div className="info">
              <div className="name">{c.codicePagamentoDescrizione || c.codicePagamento || "—"}</div>
              {c.codicePagamento && (
                <div className="detail">Codice: {c.codicePagamento}</div>
              )}
            </div>
            {c.codicePagamento && <span className="tag">Attivo</span>}
          </div>
        </div>

        {/* Sicurezza + password */}
        <div className="profile-card">
          <h2><ShieldIcon /> Sicurezza</h2>

          <div className="sec-item">
            <div>
              <div style={{ fontWeight: 500 }}>Cambio password</div>
              <div className="detail">Ultima modifica: 15/06/2026</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setPwOpen(true)}>Modifica</button>
          </div>

          <div className="sec-item">
            <div>
              <div style={{ fontWeight: 500 }}>Ultimo accesso</div>
              <div className="detail">
                {customer.ultimoAccesso
                  ? new Date(customer.ultimoAccesso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "N/D"}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Change Password Modal */}
      {pwOpen && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) { setPwOpen(false); setPwError(""); } }}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Cambio password">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Cambio password</h2>
              <button onClick={() => { setPwOpen(false); setPwError(""); }}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)", padding: 0, lineHeight: 1 }}
                aria-label="Chiudi">&times;</button>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "8px 0 16px" }}>Inserisci la password attuale e la nuova password.</p>

            {pwError && (
              <div style={{ background: "oklch(96% 0.03 25)", border: "1px solid var(--danger)", color: "var(--danger)", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 14 }}>
                {pwError}
              </div>
            )}
            {pwOk && (
              <div style={{ background: "oklch(95% 0.06 150)", border: "1px solid var(--ok)", color: "var(--ok)", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 14 }}>
                Password aggiornata correttamente.
              </div>
            )}

            <form onSubmit={handlePwSubmit}>
              <label style={{ display: "block", fontSize: 12, color: "var(--muted)", fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }} htmlFor="cp-old">Password attuale</label>
              <input id="cp-old" type="password" required autoComplete="current-password"
                style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, font: "inherit", fontSize: 14, background: "var(--bg)", color: "var(--fg)", marginBottom: 14, boxSizing: "border-box" }}
                value={pwOld} onChange={(e) => setPwOld(e.target.value)} />

              <label style={{ display: "block", fontSize: 12, color: "var(--muted)", fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }} htmlFor="cp-new">Nuova password</label>
              <input id="cp-new" type="password" required autoComplete="new-password" minLength={8}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, font: "inherit", fontSize: 14, background: "var(--bg)", color: "var(--fg)", marginBottom: 14, boxSizing: "border-box" }}
                value={pwNew} onChange={(e) => setPwNew(e.target.value)} />

              <label style={{ display: "block", fontSize: 12, color: "var(--muted)", fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }} htmlFor="cp-confirm">Conferma nuova password</label>
              <input id="cp-confirm" type="password" required autoComplete="new-password" minLength={8}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, font: "inherit", fontSize: 14, background: "var(--bg)", color: "var(--fg)", marginBottom: 14, boxSizing: "border-box" }}
                value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} />

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setPwOpen(false); setPwError(""); }}>Annulla</button>
                <button type="submit" className="btn btn-primary">Cambia password</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  );
}
