"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import Modal from "../common/Modal";

interface StatoPrivacy {
  versione: string;
  accettataVersione: string | null;
}

/**
 * Informativa del portale al primo accesso (e a ogni cambio di versione).
 * Non è un consenso: la base è contrattuale, qui si registra la presa visione.
 */
export default function PrivacyNoticeModal() {
  const [stato, setStato] = useState<StatoPrivacy | null>(null);
  const [chiuso, setChiuso] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<StatoPrivacy>("/api/auth/privacy").then(setStato).catch(() => undefined);
  }, []);

  if (!stato || stato.accettataVersione === stato.versione) return null;

  async function accetta() {
    if (!stato) return;
    setBusy(true);
    try {
      await api.post("/api/auth/privacy/accetta", { versione: stato.versione });
      setStato({ ...stato, accettataVersione: stato.versione });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={!chiuso}
      title="Informativa privacy"
      maxWidth={640}
      onClose={() => setChiuso(true)}
      footer={
        <button type="button" className="btn btn-primary" onClick={() => void accetta()} disabled={busy}>
          {busy ? "Salvo…" : "Ho letto l'informativa"}
        </button>
      }
    >
      <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
        <p>
          Il portale tratta i dati del tuo account e della tua azienda per gestire l&apos;accesso, gli ordini e
          l&apos;assistenza. Registriamo inoltre alcune azioni compiute <strong>dopo il login</strong> (pagine,
          articoli, ricerche) per migliorare il catalogo e il servizio: puoi opporti in qualsiasi momento dal tuo
          profilo.
        </p>
        <p>
          Alcune funzioni usano un sistema di intelligenza artificiale (ricerca in linguaggio naturale, ricerca per
          immagine, suggerimenti di prodotto). I risultati sono proposte: le decisioni commerciali restano umane.
        </p>
        <p style={{ marginBottom: 0 }}>
          Testo completo, destinatari, trasferimenti e durate di conservazione:{" "}
          <Link href="/privacy" target="_blank" rel="noopener">
            informativa privacy
          </Link>
          . Versione {stato.versione}.
        </p>
      </div>
    </Modal>
  );
}
