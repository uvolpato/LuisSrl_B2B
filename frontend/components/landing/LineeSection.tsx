export default function LineeSection() {
  return (
    <section id="lines" className="section" data-od-id="linee">
      <div className="container stack" style={{ gap: 40 }}>
        <div style={{ maxWidth: "36ch" }}>
          <p className="eyebrow">LINEE DI PRODOTTO</p>
          <h2 className="h2">Scopri le nostre collezioni.</h2>
        </div>
        <div className="grid-3">
          <div className="linea-card">
            <img src="/images/b2b/catalogo-cotto-esterni.webp" alt="Cotto da Esterno" style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover" }} />
            <div className="linea-body">
              <h3>Cotto da Esterno</h3>
              <p>Vasi e fioriere in cotto per spazi esterni, resistenti alle intemperie.</p>
            </div>
          </div>
          <div className="linea-card">
            <img src="/images/b2b/catalogo-fiberstone.webp" alt="Fiberstone" style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover" }} />
            <div className="linea-body">
              <h3>Fiberstone</h3>
              <p>Leggeri e resistenti, perfetti per giardini e terrazze moderne.</p>
            </div>
          </div>
          <div className="linea-card">
            <img src="/images/b2b/catalogo-cotto-interni.webp" alt="Cotto da Interni" style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover" }} />
            <div className="linea-body">
              <h3>Cotto da Interni</h3>
              <p>Artigianato tradizionale, finiture uniche e carattere per ambienti interni.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
