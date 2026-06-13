"use client";

export default function HeroSection({ onOpenLogin }: { onOpenLogin: () => void }) {
  return (
    <section className="hero-image-full" data-od-id="hero">
      <img src="/images/b2b/hero-slider.webp" alt="Collezione vasi Luis" />
      <div className="hero-overlay">
        <div className="hero-overlay-inner">
          <p className="eyebrow">Portale B2B riservato ai rivenditori</p>
          <h1>Il catalogo Luis, sempre aggiornato</h1>
          <p className="lead">Prezzi personalizzati, giacenza in tempo reale e ordini semplici. Tutto per il tuo negozio, in un unico portale riservato.</p>
          <div className="hero-cta">
            <button className="btn btn-primary" onClick={onOpenLogin}>Accedi al portale</button>
            <a href="#info" className="btn btn-secondary">Scopri di più</a>
          </div>
        </div>
      </div>
    </section>
  );
}
