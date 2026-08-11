"use client";

import { useState, useEffect } from "react";
import Modal from "../common/Modal";
import ComboboxField from "../admin/ComboboxField";

interface IndirizzoData {
  ragioneSociale?: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia?: string;
  nazione?: string;
  abituale?: boolean;
}

const PROVINCE = [
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

const NAZIONI = [
  { value: "IT", label: "Italia", group: "Europa" },
  { value: "AL", label: "Albania", group: "Europa" },
  { value: "AD", label: "Andorra", group: "Europa" },
  { value: "AT", label: "Austria", group: "Europa" },
  { value: "BE", label: "Belgio", group: "Europa" },
  { value: "BY", label: "Bielorussia", group: "Europa" },
  { value: "BA", label: "Bosnia-Erzegovina", group: "Europa" },
  { value: "BG", label: "Bulgaria", group: "Europa" },
  { value: "CY", label: "Cipro", group: "Europa" },
  { value: "HR", label: "Croazia", group: "Europa" },
  { value: "DK", label: "Danimarca", group: "Europa" },
  { value: "EE", label: "Estonia", group: "Europa" },
  { value: "FI", label: "Finlandia", group: "Europa" },
  { value: "FR", label: "Francia", group: "Europa" },
  { value: "DE", label: "Germania", group: "Europa" },
  { value: "GR", label: "Grecia", group: "Europa" },
  { value: "IE", label: "Irlanda", group: "Europa" },
  { value: "IS", label: "Islanda", group: "Europa" },
  { value: "LV", label: "Lettonia", group: "Europa" },
  { value: "LI", label: "Liechtenstein", group: "Europa" },
  { value: "LT", label: "Lituania", group: "Europa" },
  { value: "LU", label: "Lussemburgo", group: "Europa" },
  { value: "MT", label: "Malta", group: "Europa" },
  { value: "MD", label: "Moldavia", group: "Europa" },
  { value: "MC", label: "Monaco", group: "Europa" },
  { value: "ME", label: "Montenegro", group: "Europa" },
  { value: "NO", label: "Norvegia", group: "Europa" },
  { value: "NL", label: "Paesi Bassi", group: "Europa" },
  { value: "PL", label: "Polonia", group: "Europa" },
  { value: "PT", label: "Portogallo", group: "Europa" },
  { value: "GB", label: "Regno Unito", group: "Europa" },
  { value: "CZ", label: "Rep. Ceca", group: "Europa" },
  { value: "RO", label: "Romania", group: "Europa" },
  { value: "RU", label: "Russia", group: "Europa" },
  { value: "SM", label: "San Marino", group: "Europa" },
  { value: "RS", label: "Serbia", group: "Europa" },
  { value: "SK", label: "Slovacchia", group: "Europa" },
  { value: "SI", label: "Slovenia", group: "Europa" },
  { value: "ES", label: "Spagna", group: "Europa" },
  { value: "SE", label: "Svezia", group: "Europa" },
  { value: "CH", label: "Svizzera", group: "Europa" },
  { value: "TR", label: "Turchia", group: "Europa" },
  { value: "UA", label: "Ucraina", group: "Europa" },
  { value: "HU", label: "Ungheria", group: "Europa" },
  { value: "VA", label: "Città del Vaticano", group: "Europa" },
  { value: "AR", label: "Argentina", group: "America" },
  { value: "BO", label: "Bolivia", group: "America" },
  { value: "BR", label: "Brasile", group: "America" },
  { value: "CA", label: "Canada", group: "America" },
  { value: "CL", label: "Cile", group: "America" },
  { value: "CO", label: "Colombia", group: "America" },
  { value: "CR", label: "Costa Rica", group: "America" },
  { value: "CU", label: "Cuba", group: "America" },
  { value: "EC", label: "Ecuador", group: "America" },
  { value: "GT", label: "Guatemala", group: "America" },
  { value: "MX", label: "Messico", group: "America" },
  { value: "PA", label: "Panama", group: "America" },
  { value: "PY", label: "Paraguay", group: "America" },
  { value: "PE", label: "Perù", group: "America" },
  { value: "US", label: "Stati Uniti", group: "America" },
  { value: "UY", label: "Uruguay", group: "America" },
  { value: "VE", label: "Venezuela", group: "America" },
  { value: "AF", label: "Afghanistan", group: "Asia" },
  { value: "SA", label: "Arabia Saudita", group: "Asia" },
  { value: "AM", label: "Armenia", group: "Asia" },
  { value: "AZ", label: "Azerbaigian", group: "Asia" },
  { value: "BH", label: "Bahrein", group: "Asia" },
  { value: "BD", label: "Bangladesh", group: "Asia" },
  { value: "CN", label: "Cina", group: "Asia" },
  { value: "KP", label: "Corea del Nord", group: "Asia" },
  { value: "KR", label: "Corea del Sud", group: "Asia" },
  { value: "AE", label: "Emirati Arabi", group: "Asia" },
  { value: "PH", label: "Filippine", group: "Asia" },
  { value: "GE", label: "Georgia", group: "Asia" },
  { value: "JP", label: "Giappone", group: "Asia" },
  { value: "JO", label: "Giordania", group: "Asia" },
  { value: "IN", label: "India", group: "Asia" },
  { value: "ID", label: "Indonesia", group: "Asia" },
  { value: "IR", label: "Iran", group: "Asia" },
  { value: "IQ", label: "Iraq", group: "Asia" },
  { value: "IL", label: "Israele", group: "Asia" },
  { value: "KW", label: "Kuwait", group: "Asia" },
  { value: "LA", label: "Laos", group: "Asia" },
  { value: "LB", label: "Libano", group: "Asia" },
  { value: "MY", label: "Malesia", group: "Asia" },
  { value: "MN", label: "Mongolia", group: "Asia" },
  { value: "MM", label: "Myanmar", group: "Asia" },
  { value: "NP", label: "Nepal", group: "Asia" },
  { value: "OM", label: "Oman", group: "Asia" },
  { value: "PK", label: "Pakistan", group: "Asia" },
  { value: "QA", label: "Qatar", group: "Asia" },
  { value: "SG", label: "Singapore", group: "Asia" },
  { value: "SY", label: "Siria", group: "Asia" },
  { value: "LK", label: "Sri Lanka", group: "Asia" },
  { value: "TH", label: "Thailandia", group: "Asia" },
  { value: "TW", label: "Taiwan", group: "Asia" },
  { value: "VN", label: "Vietnam", group: "Asia" },
  { value: "YE", label: "Yemen", group: "Asia" },
  { value: "DZ", label: "Algeria", group: "Africa" },
  { value: "AO", label: "Angola", group: "Africa" },
  { value: "CM", label: "Camerun", group: "Africa" },
  { value: "EG", label: "Egitto", group: "Africa" },
  { value: "ET", label: "Etiopia", group: "Africa" },
  { value: "GH", label: "Ghana", group: "Africa" },
  { value: "KE", label: "Kenya", group: "Africa" },
  { value: "LY", label: "Libia", group: "Africa" },
  { value: "MG", label: "Madagascar", group: "Africa" },
  { value: "MA", label: "Marocco", group: "Africa" },
  { value: "MZ", label: "Mozambico", group: "Africa" },
  { value: "NG", label: "Nigeria", group: "Africa" },
  { value: "SN", label: "Senegal", group: "Africa" },
  { value: "ZA", label: "Sud Africa", group: "Africa" },
  { value: "SD", label: "Sudan", group: "Africa" },
  { value: "TZ", label: "Tanzania", group: "Africa" },
  { value: "TN", label: "Tunisia", group: "Africa" },
  { value: "UG", label: "Uganda", group: "Africa" },
  { value: "AU", label: "Australia", group: "Oceania" },
  { value: "FJ", label: "Figi", group: "Oceania" },
  { value: "NZ", label: "Nuova Zelanda", group: "Oceania" },
  { value: "PG", label: "Papua Nuova Guinea", group: "Oceania" },
  { value: "ROW", label: "Altro (Resto del mondo)", group: "Mondo" },
];

export default function IndirizzoEditorModal({
  open,
  title,
  initial,
  onSave,
  onClose,
}: {
  open: boolean;
  title: string;
  initial?: IndirizzoData;
  onSave: (data: IndirizzoData) => Promise<void>;
  onClose: () => void;
}) {
  const [ragione, setRagione] = useState(initial?.ragioneSociale ?? "");
  const [indirizzo, setIndirizzo] = useState(initial?.indirizzo ?? "");
  const [cap, setCap] = useState(initial?.cap ?? "");
  const [citta, setCitta] = useState(initial?.citta ?? "");
  const [provincia, setProvincia] = useState(initial?.provincia ?? "");
  const [nazione, setNazione] = useState(initial?.nazione ?? "IT");
  const [abituale, setAbituale] = useState(initial?.abituale ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRagione(initial?.ragioneSociale ?? "");
    setIndirizzo(initial?.indirizzo ?? "");
    setCap(initial?.cap ?? "");
    setCitta(initial?.citta ?? "");
    setProvincia(initial?.provincia ?? "");
    setNazione(initial?.nazione ?? "IT");
    setAbituale(initial?.abituale ?? false);
  }, [open, initial]);

  if (!open) return null;

  async function handleSave() {
    if (!indirizzo.trim() || !cap.trim() || !citta.trim()) return;
    setSaving(true);
    await onSave({ ragioneSociale: ragione || undefined, indirizzo: indirizzo.trim(), cap: cap.trim(), citta: citta.trim(), provincia: provincia || undefined, nazione, abituale });
    setSaving(false);
  }

  return (
    <Modal open size="md" title={title} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary btn-sm" onClick={onClose}>Annulla</button>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>Salva</button>
      </>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>Intestazione</label>
          <input style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, font: "inherit", fontSize: 13, background: "var(--surface)", boxSizing: "border-box" }} value={ragione} onChange={e => setRagione(e.target.value)} placeholder="Es. Nome destinatario" />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>Indirizzo *</label>
          <input style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, font: "inherit", fontSize: 13, background: "var(--surface)", boxSizing: "border-box" }} value={indirizzo} onChange={e => setIndirizzo(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>CAP *</label>
          <input style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, font: "inherit", fontSize: 13, background: "var(--surface)", boxSizing: "border-box" }} value={cap} onChange={e => setCap(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>Città *</label>
          <input style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, font: "inherit", fontSize: 13, background: "var(--surface)", boxSizing: "border-box" }} value={citta} onChange={e => setCitta(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>Provincia</label>
          <ComboboxField value={provincia} onChange={setProvincia} options={PROVINCE} allowAuto={false} placeholder="Cerca provincia..." />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>Nazione</label>
          <ComboboxField value={nazione} onChange={setNazione} options={NAZIONI} allowAuto={false} placeholder="Cerca nazione..." />
        </div>
      </div>
      <div style={{ marginTop: 2 }}>
        <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Predefinito</label>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface)" }} onClick={() => setAbituale(!abituale)}>
          <input type="checkbox" checked={abituale} onChange={e => setAbituale(e.target.checked)} style={{ accentColor: "var(--accent)", margin: 0, width: 15, height: 15 }} />
          Imposta come indirizzo principale
        </div>
      </div>
    </Modal>
  );
}
