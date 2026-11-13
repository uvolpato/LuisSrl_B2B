"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../../../lib/api";
import Notice from "../../common/Notice";

interface Dispositivo {
  id: number;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}

/**
 * Secondo fattore via email: attivazione, dispositivi fidati, disattivazione.
 * Il codice vale 10 minuti, una volta sola, massimo 5 tentativi.
 */
export default function MfaSection() {
  const [attivo, setAttivo] = useState<boolean | null>(null);
  const [metodo, setMetodo] = useState<string | null>(null);
  const [inviato, setInviato] = useState<string | null>(null);
  const [codice, setCodice] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dispositivi, setDispositivi] = useState<Dispositivo[]>([]);

  const carica = useCallback(async () => {
    try {
      const s = await api.get<{ attivo: boolean; metodo: string | null }>("/api/auth/mfa/stato");
      setAttivo(!!s.attivo);
      setMetodo(s.metodo);
      if (s.attivo) {
        setDispositivi(await api.get<Dispositivo[]>("/api/auth/mfa/dispositivi"));
      }
    } catch {
      setAttivo(false);
    }
  }, []);

  useEffect(() => {
    void carica();
  }, [carica]);

  async function inviaCodice() {
    setBusy(true);
    setErrore(null);
    setOk(null);
    try {
      const res = await api.post<{ email: string }>("/api/auth/mfa/email/attiva", {});
      setInviato(res.email);
      setCodice("");
    } catch {
      setErrore("Invio non riuscito. Controlla la posta configurata e riprova.");
    } finally {
      setBusy(false);
    }
  }

  async function confermaCodice() {
    setBusy(true);
    setErrore(null);
    try {
      await api.post("/api/auth/mfa/email/conferma", { code: codice.trim() });
      setAttivo(true);
      setMetodo("email");
      setInviato(null);
      setCodice("");
      await carica();
      setOk("Verifica via email attiva. Al prossimo accesso riceverai un codice.");
    } catch {
      setErrore("Codice non valido o scaduto.");
    } finally {
      setBusy(false);
    }
  }

  async function disattiva() {
    setBusy(true);
    setErrore(null);
    setOk(null);
    try {
      await api.post("/api/auth/mfa/disattiva", { password });
      setPassword("");
      setAttivo(false);
      setMetodo(null);
      setDispositivi([]);
      setOk("Verifica disattivata.");
    } catch {
      setErrore("Password non corretta.");
    } finally {
      setBusy(false);
    }
  }

  async function revocaDispositivo(id: number) {
    setBusy(true);
    setErrore(null);
    try {
      await api.post(`/api/auth/mfa/dispositivi/${id}/revoca`, {});
      setDispositivi((p) => p.filter((d) => d.id !== id));
      setOk("Dispositivo revocato: al prossimo accesso servirà il codice.");
    } catch {
      setErrore("Revoca non riuscita. Riprova.");
    } finally {
      setBusy(false);
    }
  }

  async function revocaTutti() {
    setBusy(true);
    setErrore(null);
    try {
      await api.post("/api/auth/mfa/dispositivi/revoca-tutti", {});
      setDispositivi([]);
      setOk("Tutti i dispositivi revocati.");
    } catch {
      setErrore("Revoca non riuscita. Riprova.");
    } finally {
      setBusy(false);
    }
  }

  function data(iso: string) {
    return new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
  }

  if (attivo === null) return <p style={{ padding: 16 }}>Caricamento…</p>;

  return (
    <div style={{ maxWidth: 760, display: "grid", gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Verifica in due passaggi</h2>
      <p style={{ margin: 0, fontSize: 13.5, color: "var(--muted)" }}>
        Oltre alla password chiediamo un <strong>codice di 6 cifre inviato via email</strong>. Vale 10 minuti,
        una sola volta, massimo 5 tentativi. Protegge l&apos;account admin anche se la password viene rubata.
        Nessuna app da installare.
      </p>

      {errore && <Notice variant="error" onClose={() => setErrore(null)}>{errore}</Notice>}
      {ok && <Notice variant="success" onClose={() => setOk(null)}>{ok}</Notice>}

      {!attivo && !inviato && (
        <button className="btn btn-primary" type="button" onClick={() => void inviaCodice()} disabled={busy} style={{ justifySelf: "start" }}>
          Attiva la verifica via email
        </button>
      )}

      {inviato && (
        <div className="profile-card" style={{ padding: 16, borderRadius: 10, border: "1px solid var(--border)" }}>
          <p style={{ marginTop: 0 }}>
            Codice inviato a <strong>{inviato}</strong>. Inseriscilo qui per attivare la verifica:
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              className="input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={codice}
              onChange={(e) => setCodice(e.target.value)}
              style={{ maxWidth: 140 }}
            />
            <button className="btn btn-primary" type="button" onClick={() => void confermaCodice()} disabled={busy || codice.trim().length < 6}>
              Conferma
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => void inviaCodice()} disabled={busy}>
              Reinvia
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => { setInviato(null); setCodice(""); }} disabled={busy}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {attivo && (
        <div className="profile-card" style={{ background: "#f7f5f1", padding: 16, borderRadius: 10 }}>
          <p style={{ marginTop: 0, fontWeight: 500 }}>
            Verifica attiva: {metodo === "email" ? "codice via email" : "app di autenticazione"}.
          </p>
          {metodo !== "email" && (
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 0 }}>
              Per passare al codice via email, disattiva e riattiva la verifica.
            </p>
          )}
          <div style={{ display: "grid", gap: 8, maxWidth: 320 }}>
            <label style={{ fontSize: 13 }}>
              Password (per disattivare)
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <button className="btn btn-danger-outline" type="button" onClick={() => void disattiva()} disabled={busy || !password}>
              Disattiva verifica
            </button>
          </div>
        </div>
      )}

      {attivo && (
        <div className="profile-card" style={{ background: "#f7f5f1", padding: 16, borderRadius: 10 }}>
          <p style={{ marginTop: 0, fontWeight: 500 }}>Dispositivi fidati</p>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 0 }}>
            Da questi browser il codice non viene chiesto per 90 giorni. Se non li riconosci, revocali.
          </p>
          {dispositivi.length === 0 ? (
            <p style={{ fontSize: 13, margin: 0 }}>Nessun dispositivo fidato.</p>
          ) : (
            <div className="data-table" style={{ marginBottom: 10 }}>
              <div className="data-table-scroll">
                <table>
                  <thead>
                    <tr><th>Dispositivo</th><th>Ultimo uso</th><th>Scade</th><th></th></tr>
                  </thead>
                  <tbody>
                    {dispositivi.map((d) => (
                      <tr key={d.id}>
                        <td style={{ fontSize: 12.5 }}>{d.userAgent ?? "Browser sconosciuto"}</td>
                        <td className="mono" style={{ fontSize: 12.5 }}>{data(d.lastUsedAt)}</td>
                        <td className="mono" style={{ fontSize: 12.5 }}>{data(d.expiresAt)}</td>
                        <td>
                          <button className="btn btn-danger-outline btn-xs" type="button" onClick={() => void revocaDispositivo(d.id)} disabled={busy}>
                            Revoca
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {dispositivi.length > 0 && (
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => void revocaTutti()} disabled={busy}>
              Revoca tutti i dispositivi
            </button>
          )}
        </div>
      )}
    </div>
  );
}
