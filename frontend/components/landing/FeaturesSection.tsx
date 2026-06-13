export default function FeaturesSection() {
  return (
    <section id="info" className="section" data-section="features">
      <div className="container stack" style={{ gap: 56 }}>
        <div style={{ maxWidth: "36ch" }}>
          <p className="eyebrow">PERCHÉ LUIS B2B</p>
          <h2 className="h2">Tutto quello che serve al tuo negozio, senza complicazioni.</h2>
        </div>
        <div className="grid-3">
          <div className="feature card-flat">
            <div className="feature-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 3v18M3 12h18" />
              </svg>
            </div>
            <h3>Prezzi su misura</h3>
            <p>Ogni rivenditore vede i propri prezzi, con sconti personalizzati su cliente, linea e famiglia.</p>
          </div>
          <div className="feature card-flat">
            <div className="feature-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 8v4l3 2" />
              </svg>
            </div>
            <h3>Giacenza visibile</h3>
            <p>Sai quanti pezzi sono disponibili a magazzino prima di ordinare. Niente sorprese.</p>
          </div>
          <div className="feature card-flat">
            <div className="feature-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 7h16M4 12h10M4 17h16" />
              </svg>
            </div>
            <h3>Ordini rapidi</h3>
            <p>Seleziona varianti, quantità e moltiplici in pochi click. L'ordine arriva direttamente a Luis.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
