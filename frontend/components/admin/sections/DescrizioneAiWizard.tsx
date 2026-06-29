"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../lib/api";
import { useConfirm } from "../../common/ConfirmProvider";

interface StepDef {
  step: number;
  label: string;
  icon: string;
  prompt: string;
}

const STEPS: StepDef[] = [
  { step: 1, label: "Forma", icon: "◬", prompt: "Osserva la forma del prodotto. Descrivi cosa vedi: è slanciato o tozzo? ha curve morbide o linee nette? che dimensioni ha? sembra massiccio o leggero?" },
  { step: 2, label: "Superficie", icon: "✋", prompt: "Osserva la superficie. È liscia o ruvida? opaca o lucida? calda o fredda al tatto? sembra lavorata a mano o industriale? che materiale sembra? noti venature, screpolature, imperfezioni volute?" },
  { step: 3, label: "Contesto", icon: "◻", prompt: "Immagina questo prodotto in un ambiente. Dove lo metteresti? in una veranda, in un giardino, su un tavolo, in un negozio? Che luce riceve? Che altri oggetti gli stanno accanto? È formale o informale?" },
  { step: 4, label: "Emozione", icon: "♥", prompt: "Che emozione ti trasmette? È elegante o rustico? moderno o classico? sobrio o decorato? rigoroso o giocoso? trasmette calma, energia, prestigio, naturalezza?" },
  { step: 5, label: "Libera", icon: "♪", prompt: "Ora parlane liberamente. Racconta tutto ciò che ti viene in mente su questo prodotto. Non preoccuparti di essere ordinato: l'AI metterà ordine dopo." },
];

interface WizardResult {
  descrizioneDettagliata: string;
  descrizioneBreve: string;
  raw: string;
}

export interface StepTesto {
  step: number;
  label: string;
  testo: string;
}

interface Props {
  codiceLinea: string;
  immagini: { id: number; url: string; copertina: boolean; tipo: string }[];
  descrizione?: string | null;
  descrizioneDettagliata?: string | null;
  initialStepTesti?: StepTesto[] | null;
  onSave: (descrizione: string | null, descrizioneDettagliata: string | null, stepTesti?: StepTesto[]) => void;
}

export default function DescrizioneAiWizard({ codiceLinea, immagini, descrizione: savedDescrizione, descrizioneDettagliata: savedDettagliata, initialStepTesti, onSave }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const hasExistingContent = !!(savedDettagliata && savedDettagliata.length > 0);
  const [stepTesti, setStepTesti] = useState<StepTesto[]>(
    initialStepTesti?.length === STEPS.length
      ? initialStepTesti
      : STEPS.map((s) => ({ step: s.step, label: s.label, testo: "" })),
  );
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);
  const [result, setResult] = useState<WizardResult | null>(
    hasExistingContent
      ? { descrizioneDettagliata: savedDettagliata ?? "", descrizioneBreve: savedDescrizione ?? "", raw: "" }
      : initialStepTesti?.some((s) => s.testo.trim().length > 0)
        ? { descrizioneDettagliata: "", descrizioneBreve: "", raw: "" }
        : null,
  );
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [showGuida, setShowGuida] = useState(false);
  const progressMsgs = ["Analizzo le tue parole…", "Strutturo la descrizione…", "Curo lo stile…", "Quasi fatto…"];
  const latestStepTesti = useRef(stepTesti);
  latestStepTesti.current = stepTesti;

  const hasSavedSteps = stepTesti.some((s) => s.testo.length > 0);
  const confirm = useConfirm();
  const copertina = immagini.find((i) => i.copertina) || immagini.find((i) => i.tipo === "CARICATA") || immagini[0];

  const startListening = useCallback(() => {
    const SpeechRecognition: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { confirm({ message: "Il riconoscimento vocale non è supportato da questo browser. Usa Chrome o Edge.", title: "Microfono non disponibile" }); return; }
    const rec = new SpeechRecognition();
    rec.lang = "it-IT";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      if (final) {
        setStepTesti((prev) => prev.map((s, idx) => idx === currentStep ? { ...s, testo: s.testo + final } : s));
      }
      setInterimText(interim);
    };
    rec.onend = () => { setListening(false); setInterimText(""); };
    rec.onerror = () => { setListening(false); setInterimText(""); };
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  }, [currentStep]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
    setInterimText("");
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { /* */ } }
      onSave(null, null, latestStepTesti.current);
    };
  }, []);

  // Propaga stepTesti + result descrizioni al padre appena cambiano (per isDirty modale),
  // ma saltando la prima inizializzazione
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    onSave(result?.descrizioneBreve ?? null, result?.descrizioneDettagliata ?? null, stepTesti);
  }, [stepTesti, result?.descrizioneDettagliata, result?.descrizioneBreve]);

  function updateTesto(val: string) {
    setStepTesti((prev) => prev.map((s, idx) => idx === currentStep ? { ...s, testo: val } : s));
  }

  function canGoNext(): boolean {
    return stepTesti[currentStep]?.testo?.trim().length > 0;
  }

  function goNext() {
    stopListening();
    onSave(null, null, stepTesti);
    if (currentStep < STEPS.length - 1) setCurrentStep((p) => p + 1);
  }

  function goBack() {
    onSave(null, null, stepTesti);
    if (currentStep > 0) setCurrentStep((p) => p - 1);
  }

  async function handleGenerate() {
    setLoading(true);
    setResult(null);
    const msgInterval = setInterval(() => {
      setProgressMsg(progressMsgs[Math.floor(Math.random() * progressMsgs.length)]);
    }, 800);
    try {
      const res = await api.post<WizardResult>(`/api/integrazione/articoli/${codiceLinea}/descrizione/wizard`, {
        stepTesti,
        azione: "genera",
        promptPersonalizzato: customPrompt || undefined,
      });
    onSave(null, null, stepTesti);
      setResult(res);
    } catch (e) {
      setResult(null); setProgressMsg("Errore: " + String(e));
    } finally {
      clearInterval(msgInterval);
      setProgressMsg("");
      setLoading(false);
    }
  }

  const currentTesto = stepTesti[currentStep]?.testo || "";
  const wizardError = progressMsg.startsWith("Errore") ? progressMsg : null;

  if (loading) {
    return (
      <div className="wizard-loading">
        <div className="wizard-spinner" />
        <p>{progressMsg || "Rielaboro con AI…"}</p>
      </div>
    );
  }

  const hasGeneratedDesc = !!(result?.descrizioneDettagliata);

  if (result) {
    return (
      <div className="wizard-result">
        {wizardError && <div className="wizard-error">{wizardError}</div>}
        <div className="wizard-result-panels">
          <div className="wizard-result-col">
            {hasGeneratedDesc ? (
              <>
                <h4>Descrizione dettagliata</h4>
                <textarea
                  className="textarea wizard-result-textarea"
                  value={result.descrizioneDettagliata}
                  onChange={(e) => setResult({ ...result, descrizioneDettagliata: e.target.value })}
                  rows={10}
                />
              </>
            ) : (
              <>
                <h4>Nessuna descrizione generata</h4>
                <p className="wizard-empty-desc">Hai salvato i tuoi contributi, ma non hai ancora generato la descrizione con AI.</p>
                <div className="wizard-result-actions" style={{ marginTop: 16 }}>
                  <button className="btn btn-primary" onClick={handleGenerate}>
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16, marginRight: 6 }}><path d="M12 1.5l2.47 6.53L21 10.5l-6.53 2.47L12 19.5l-2.47-6.53L3 10.5l6.53-2.47z"/></svg>
                    Genera descrizione con AI
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="wizard-result-col">
            {hasGeneratedDesc && (
              <>
                <h4>Descrizione breve (pubblica)</h4>
                <textarea
                  className="textarea wizard-result-textarea"
                  value={result.descrizioneBreve}
                  onChange={(e) => setResult({ ...result, descrizioneBreve: e.target.value })}
                  rows={3}
                  maxLength={200}
                />
                <p className="wizard-char-count">{result.descrizioneBreve.length}/200 caratteri</p>
              </>
            )}
            <h4 style={{ marginTop: hasGeneratedDesc ? 16 : 0 }}>Dimensioni sensoriali</h4>
            <div className="wizard-dimensions">
              {stepTesti.filter(s => s.testo.trim()).map(s => (
                <div key={s.step} className="wizard-dim-item">
                  <span className="wizard-dim-icon">{STEPS[s.step - 1]?.icon}</span>
                  <div className="wizard-dim-info">
                    <strong>{s.label}</strong>
                    <div className="wizard-dim-dots">
                      {"●".repeat(Math.min(Math.ceil(s.testo.length / 30), 6))}{"○".repeat(Math.max(6 - Math.min(Math.ceil(s.testo.length / 30), 6), 0))}
                    </div>
                    <span className="wizard-dim-preview">{s.testo.slice(0, 60)}{s.testo.length > 60 ? "…" : ""}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="wizard-result-footer">
              {hasGeneratedDesc && (
                <button className="btn btn-primary btn-sm" onClick={handleGenerate}>Rigenera</button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => { setResult(null); setCurrentStep(STEPS.length - 1); }}>
                {hasGeneratedDesc ? "Modifica" : "Continua modifica"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPromptEditor(!showPromptEditor)}>
                {showPromptEditor ? "Nascondi" : "Prompt AI"}
              </button>
            </div>
            {showPromptEditor && (
              <div className="wizard-prompt-editor">
                <label>Prompt personalizzato per l'AI</label>
                <textarea
                  className="textarea"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={4}
                  placeholder="Lascia vuoto per usare il prompt predefinito."
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="wizard">
      {wizardError && <div className="wizard-error">{wizardError}</div>}
      <div className="wizard-header">
        <div className="wizard-steps">
          {STEPS.map((s, idx) => (
            <button
              key={s.step}
              className={`wizard-step-dot ${idx === currentStep ? "active" : idx < currentStep ? "done" : ""} ${hasExistingContent && idx === currentStep ? "existing" : ""}`}
              onClick={() => { if (idx <= currentStep || canGoNext()) setCurrentStep(idx); }}
              disabled={idx > currentStep && !canGoNext()}
              title={s.label}
            >
              <span className="wizard-dot-icon">{s.icon}</span>
              <span className="wizard-dot-label">{s.label}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowGuida(!showGuida)} title="Guida sensoriale">?</button>
      </div>

      {showGuida && (
        <div className="wizard-guida">
          <table>
            <thead><tr><th>Dimensione</th><th>Domande guida</th><th>Parole chiave</th></tr></thead>
            <tbody>
              <tr><td>Forma</td><td>È slanciato o tozzo? Curve o spigoli?</td><td>arrotondato, affusolato, massiccio, slanciato, asimmetrico</td></tr>
              <tr><td>Superficie</td><td>Liscio/ruvido? Opaco/lucido?</td><td>vellutato, ruvido, levigato, satinato, brillante, grezzo</td></tr>
              <tr><td>Contesto</td><td>Dove si usa? Interno/esterno?</td><td>giardino, veranda, salotto, negozio, terrazzo</td></tr>
              <tr><td>Emozione</td><td>Che sensazione dà?</td><td>accogliente, sereno, raffinato, autentico, caldo</td></tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="wizard-body">
        {copertina && (
          <div className="wizard-image">
            <img src={copertina.url} alt="Prodotto" />
          </div>
        )}
        <div className="wizard-content">
          <div className="wizard-prompt">
            <span className="wizard-prompt-icon">{STEPS[currentStep]?.icon}</span>
            <p>{STEPS[currentStep]?.prompt}</p>
          </div>

          <div className="wizard-input-area">
            <div className="wizard-microphone">
              {listening ? (
                <button className="wizard-mic-btn listening" onClick={stopListening} title="Ferma registrazione">
                  <span className="wizard-mic-wave" />
                  <span className="wizard-mic-wave" />
                  <span className="wizard-mic-wave" />
                  <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="4" height="12" rx="1"/><rect x="14" y="6" width="4" height="12" rx="1"/></svg>
                </button>
              ) : (
                <button className="wizard-mic-btn" onClick={startListening} title="Parla">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a3 3 0 003-3V6a3 3 0 00-6 0v5a3 3 0 003 3z"/><path d="M17 11a5 5 0 01-10 0H5a7 7 0 0014 0h-2z"/><rect x="11" y="19" width="2" height="4"/></svg>
                </button>
              )}
              {listening && <span className="wizard-mic-status">Sto ascoltando…</span>}
            </div>
            <textarea
              className="textarea wizard-textarea"
              value={currentTesto + (interimText ? (currentTesto && !currentTesto.endsWith(" ") ? " " : "") + interimText : "")}
              onChange={(e) => updateTesto(e.target.value)}
              placeholder="Parla o scrivi qui le tue osservazioni…"
              rows={4}
            />
          </div>

          <div className="wizard-nav">
            <button className="btn btn-secondary btn-sm" onClick={goBack} disabled={currentStep === 0}>
              Indietro
            </button>
            <div className="row" style={{ gap: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={async () => { if (await confirm({ message: "Cancellare il testo inserito per questo step?", title: "Cancella testo", tone: "danger" })) updateTesto(""); }} disabled={!currentTesto}>
                Cancella
              </button>
              {hasExistingContent && (
                <button className="btn btn-ghost btn-sm" onClick={() => setResult({ descrizioneDettagliata: savedDettagliata ?? "", descrizioneBreve: savedDescrizione ?? "", raw: "" })}>
                  Vedi descrizione
                </button>
              )}
              {currentStep < STEPS.length - 1 ? (
                <button className="btn btn-primary btn-sm" onClick={goNext} disabled={!canGoNext()}>
                  Avanti
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleGenerate} disabled={!canGoNext()}>
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}><path d="M12 1.5l2.47 6.53L21 10.5l-6.53 2.47L12 19.5l-2.47-6.53L3 10.5l6.53-2.47z"/></svg>
                  Rielabora con AI
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
