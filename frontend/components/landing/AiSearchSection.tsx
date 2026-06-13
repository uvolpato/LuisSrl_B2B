export default function AiSearchSection() {
  return (
    <section id="search" className="section" data-section="ai-search" style={{ background: "var(--surface)" }}>
      <div className="container">
        <div className="ai-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap-xl)", alignItems: "center" }}>
          <div className="stack" style={{ gap: 24 }}>
            <p className="eyebrow">RICERCA INTELLIGENTE</p>
            <h2 className="h2">Trovi quello che cerchi, con una frase o una foto.</h2>
            <p className="lead" style={{ maxWidth: "42ch" }}>
              Non sai il nome esatto del prodotto? Scrivi cosa ti serve in parole semplici,
              oppure carica un&apos;immagine di riferimento: il sistema trova gli articoli
              più simili dal catalogo.
            </p>
            <div style={{ display: "flex", gap: "var(--gap-md)", flexWrap: "wrap", marginTop: 8 }}>
              <div className="card" style={{ flex: 1, minWidth: 200, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-soft)", display: "grid", placeItems: "center", color: "var(--accent)", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Testo libero</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                  &laquo;Vaso alto color terracotta per giardino&raquo; — e il catalogo
                  ti mostra i risultati più pertinenti.
                </p>
              </div>
              <div className="card" style={{ flex: 1, minWidth: 200, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-soft)", display: "grid", placeItems: "center", color: "var(--accent)", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="m21 15-5-5L5 21" />
                    </svg>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Immagine di riferimento</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                  Carica una foto di un prodotto simile — il sistema individua articoli
                  con forma, colore o stile comparabile.
                </p>
              </div>
            </div>
          </div>
          <div className="ai-visual" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "100%", aspectRatio: "1", borderRadius: "var(--radius-lg)", background: "linear-gradient(135deg, var(--accent-soft), oklch(96% 0.008 240))", border: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--accent)", color: "#fff", display: "grid", placeItems: "center" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, textAlign: "center", maxWidth: "24ch" }}>Cerca per testo o carica un&apos;immagine</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", textAlign: "center", maxWidth: "30ch" }}>Risultati pertinenti in pochi secondi, direttamente dal catalogo.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
