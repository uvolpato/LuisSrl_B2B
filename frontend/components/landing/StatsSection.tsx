export default function StatsSection() {
  return (
    <section id="stats" className="section" data-section="stats">
      <div className="container">
        <p className="eyebrow" style={{ marginBottom: 40 }}>IL CATALOGO · 2026</p>
        <div className="grid-3">
          <div className="stat">
            <div className="stat-num">
              500<span className="stat-unit">+</span>
            </div>
            <p className="stat-label">Articoli disponibili tra vasi, fioriere e accessori garden.</p>
          </div>
          <div className="stat">
            <div className="stat-num">
              40<span className="stat-unit">+</span>
            </div>
            <p className="stat-label">Linee di prodotto, dalla ceramica al cotto portoghese.</p>
          </div>
          <div className="stat">
            <div className="stat-num">
              24<span className="stat-unit">h</span>
            </div>
            <p className="stat-label">Tempo medio di elaborazione ordini per spedizione.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
