"use client";

import { useEffect, useState } from "react";

interface LandingCatalogo { id: number; nome: string; copertina: string | null }
interface LandingData { mailing: string; cataloghi: LandingCatalogo[] }

/** Landing pubblica di download cataloghi: il token opaco è l'autorizzazione. */
export default function CatalogoLandingPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<LandingData | null>(null);
  const [stato, setStato] = useState<"loading" | "pronto" | "errore" | "revocato">("loading");

  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`/api/cataloghi/${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (r.status === 410) { if (!cancelled) setStato("revocato"); return null; }
        if (!r.ok) { if (!cancelled) setStato("errore"); return null; }
        return (await r.json()) as LandingData;
      })
      .then((d) => {
        if (cancelled) return;
        if (d) { setData(d); setStato("pronto"); }
      })
      .catch(() => { if (!cancelled) setStato("errore"); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {stato === "loading" && <p style={styles.muted}>Caricamento…</p>}

        {stato === "errore" && (
          <>
            <h1 style={styles.title}>Link non valido</h1>
            <p style={styles.muted}>Il collegamento che hai usato non è corretto o non esiste più. Contattaci per un nuovo link.</p>
          </>
        )}

        {stato === "revocato" && (
          <>
            <h1 style={styles.title}>Link non più attivo</h1>
            <p style={styles.muted}>Questo collegamento è stato revocato o è scaduto. Contattaci per riceverne uno nuovo.</p>
          </>
        )}

        {stato === "pronto" && data && (
          <>
            <p style={styles.eyebrow}>Luis S.r.l. · Bergamo</p>
            <h1 style={styles.title}>{data.mailing}</h1>
            <div style={styles.list}>
              {data.cataloghi.map((c) => (
                <a key={c.id} href={`/api/cataloghi/${encodeURIComponent(token!)}/${c.id}/pdf`} style={styles.item}>
                  <span style={styles.itemName}>{c.nome}</span>
                  <span style={styles.itemBtn}>Scarica PDF</span>
                </a>
              ))}
            </div>
            <p style={styles.muted}>Il link è personale. Se non sei il destinatario, ignora questo messaggio.</p>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    background: "oklch(97% 0.005 80)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    color: "oklch(22% 0.02 60)",
  },
  card: {
    background: "#fff",
    border: "1px solid oklch(88% 0.01 70)",
    borderRadius: 16,
    maxWidth: 560,
    width: "100%",
    padding: "36px 32px",
    textAlign: "center",
  },
  eyebrow: {
    fontFamily: "ui-monospace, Menlo, monospace",
    fontSize: 12,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "oklch(55% 0.14 45)",
    margin: "0 0 12px",
  },
  title: {
    fontFamily: "Iowan Old Style, Charter, Georgia, serif",
    fontSize: 28,
    lineHeight: 1.15,
    margin: "0 0 24px",
  },
  list: { display: "grid", gap: 12, margin: "0 0 20px" },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    border: "1px solid oklch(88% 0.01 70)",
    borderRadius: 12,
    padding: "14px 18px",
    textDecoration: "none",
    color: "oklch(22% 0.02 60)",
    transition: "border-color .15s",
  },
  itemName: { fontWeight: 600, fontSize: 15 },
  itemBtn: {
    background: "oklch(55% 0.14 45)",
    color: "#fff",
    borderRadius: 999,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  muted: { color: "oklch(52% 0.015 60)", fontSize: 14, margin: 0 },
};
