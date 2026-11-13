"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { useConfirm } from "../common/ConfirmProvider";

/**
 * Opposizione al tracciamento comportamentale (art. 21 GDPR).
 * La conferma compare solo quando il cliente decide di opporsi; la scelta viene salvata subito.
 */
export default function PrivacyControls() {
  const confirm = useConfirm();
  const [optOut, setOptOut] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvato, setSalvato] = useState(false);

  useEffect(() => {
    api
      .get<{ trackingOptOut?: boolean }>("/api/auth/privacy")
      .then((s) => setOptOut(!!s.trackingOptOut))
      .catch(() => setOptOut(false));
  }, []);

  async function cambia(valore: boolean) {
    setErrore(null);
    setSalvato(false);

    // Solo l'opposizione chiede conferma: è una scelta che ha conseguenze.
    if (valore) {
      const ok = await confirm({
        title: "Vuoi opporti alla registrazione delle azioni sul portale?",
        confirmLabel: "Sì, non registrare",
        cancelLabel: "Annulla",
        message: (
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            <p style={{ marginTop: 0 }}>
              Se confermi, smettiamo di registrare le azioni compiute nel portale (pagine visitate, articoli
              aperti, ricerche) e non useremo questi dati di navigazione per suggerimenti e offerte
              personalizzate.
            </p>
            <p>
              Riguarda solo i dati raccolti nel portale. I dati che provengono dal gestionale (ordini e
              acquisti), i prezzi, gli sconti contrattuali, le condizioni di pagamento e di spedizione
              restano invariati.
            </p>
            <p style={{ marginBottom: 0 }}>Potrai riattivare la registrazione quando vuoi.</p>
          </div>
        ),
      });
      if (!ok) return;
    }

    setBusy(true);
    try {
      const res = await api.post<{ trackingOptOut: boolean }>("/api/auth/tracciamento", { optOut: valore });
      setOptOut(!!res.trackingOptOut);
      setSalvato(true);
    } catch {
      setErrore("Operazione non riuscita. Riprova.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="profile-card">
      <h2>Privacy</h2>

      <div className="sec-item">
        <div>
          <div style={{ fontWeight: 500 }}>Registrazione dell&apos;utilizzo</div>
          <div className="detail" style={{ maxWidth: 520 }}>
            Puoi opporti alla registrazione delle azioni compiute nel portale (pagine, articoli, ricerche).
            Riguarda solo questi dati di navigazione: ordini e dati del gestionale, prezzi, sconti
            contrattuali, condizioni di pagamento e spedizione restano invariati.
          </div>
          {errore && <div className="detail" style={{ color: "var(--danger, #b3261e)" }}>{errore}</div>}
          {salvato && <div className="detail" style={{ color: "var(--muted)" }}>Preferenza salvata.</div>}
        </div>
        <label
          htmlFor="tracking-opt-out"
          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: busy ? "default" : "pointer" }}
        >
          <input
            id="tracking-opt-out"
            type="checkbox"
            aria-label="Non registrare il mio utilizzo"
            checked={optOut === true}
            disabled={busy || optOut === null}
            onChange={(e) => void cambia(e.target.checked)}
          />
          Non registrare
        </label>
      </div>

      <div className="sec-item">
        <div>
          <div style={{ fontWeight: 500 }}>Informativa e diritti</div>
          <div className="detail">
            Testo completo, destinatari e durate: <Link href="/privacy">informativa privacy</Link>.
          </div>
        </div>
      </div>
    </div>
  );
}
