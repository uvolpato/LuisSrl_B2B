"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { api, ApiError } from "../../lib/api";

/** Attivazione da link monouso dell'invito: il cliente sceglie la password. */
export default function AttivaPage() {
  const [token, setToken] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  async function invia(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) {
      setErrore("La password deve avere almeno 8 caratteri, una lettera e un numero.");
      return;
    }
    if (pw !== pw2) {
      setErrore("Le password non coincidono.");
      return;
    }
    setBusy(true);
    setErrore(null);
    try {
      await api.post("/api/auth/attiva", { token, password: pw });
      setFatto(true);
    } catch (err) {
      setErrore(
        err instanceof ApiError && err.code === "auth.invito_non_valido"
          ? "Link non valido o scaduto. Chiedi un nuovo invito a Luis S.r.l."
          : "Operazione non riuscita. Riprova.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div
        style={{
          width: "min(100%, 460px)",
          background: "#fff",
          border: "1px solid #dcd6d1",
          borderRadius: 14,
          padding: 28,
          boxShadow: "0 10px 30px rgba(34,24,17,.06)",
        }}
      >
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 24, margin: "0 0 6px" }}>Scegli la password</h1>

        {!token && <p style={{ fontSize: 14 }}>Link incompleto: manca il codice di attivazione. Apri il link dell&apos;email di invito.</p>}

        {token && !fatto && (
          <>
            <p style={{ fontSize: 14, color: "#706760", marginTop: 0 }}>
              Imposta la password del tuo account. Il link vale una sola volta.
            </p>
            <form onSubmit={invia} style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                Nuova password
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                />
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                Ripeti la password
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                />
              </label>
              {errore && <p style={{ color: "#b3261e", fontSize: 13, margin: 0 }}>{errore}</p>}
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? "Salvo…" : "Imposta password"}
              </button>
            </form>
          </>
        )}

        {fatto && (
          <>
            <p style={{ fontSize: 14 }}>Password impostata. Ora puoi accedere al portale.</p>
            <Link className="btn btn-primary" href="/login">
              Vai al login
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
