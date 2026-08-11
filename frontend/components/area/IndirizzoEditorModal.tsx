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
  { value: "IT", label: "Italia" }, { value: "FR", label: "Francia" }, { value: "DE", label: "Germania" },
  { value: "ES", label: "Spagna" }, { value: "AT", label: "Austria" }, { value: "BE", label: "Belgio" },
  { value: "CH", label: "Svizzera" }, { value: "NL", label: "Paesi Bassi" }, { value: "GB", label: "Regno Unito" },
  { value: "PT", label: "Portogallo" }, { value: "GR", label: "Grecia" }, { value: "PL", label: "Polonia" },
  { value: "US", label: "Stati Uniti" }, { value: "CA", label: "Canada" }, { value: "BR", label: "Brasile" },
  { value: "JP", label: "Giappone" }, { value: "CN", label: "Cina" }, { value: "AU", label: "Australia" },
  { value: "ROW", label: "Altro (Resto del mondo)" },
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
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }} onClick={() => setAbituale(!abituale)}>
        <input type="checkbox" checked={abituale} onChange={e => setAbituale(e.target.checked)} style={{ accentColor: "var(--accent)", margin: 0, width: 15, height: 15 }} />
        Predefinito
      </div>
    </Modal>
  );
}
