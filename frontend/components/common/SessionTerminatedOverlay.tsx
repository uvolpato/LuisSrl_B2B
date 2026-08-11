"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SessionTerminatedOverlay() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener("session-stolen", handler);
    return () => window.removeEventListener("session-stolen", handler);
  }, []);

  function goHome() {
    setVisible(false);
    router.push("/");
  }

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "oklch(0% 0 0 / 0.7)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "var(--surface)", borderRadius: 16, padding: "40px 32px",
        maxWidth: 420, width: "100%", textAlign: "center",
        boxShadow: "0 20px 60px oklch(0% 0 0 / 0.3)",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "oklch(92% 0.04 30)", color: "oklch(55% 0.18 30)",
          display: "grid", placeItems: "center", margin: "0 auto 20px",
          fontSize: 24,
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: "0 0 8px" }}>
          Sessione terminata
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
          Qualcun altro ha effettuato l&apos;accesso con questo account da un altro dispositivo.
          Per motivi di sicurezza, questa sessione è stata chiusa.
        </p>
        <button className="btn btn-primary" onClick={goHome} style={{ justifyContent: "center", width: "100%" }}>
          Torna alla home
        </button>
      </div>
    </div>
  );
}
