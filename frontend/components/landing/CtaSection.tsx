"use client";

export default function CtaSection({ onOpenLogin }: { onOpenLogin: () => void }) {
  return (
    <section className="section" data-section="cta" style={{ textAlign: "center" }}>
      <div className="container" style={{ maxWidth: 600 }}>
        <h2 className="h2">Pronto a ordinare?</h2>
        <p className="lead" style={{ margin: "16px auto 32px" }}>
          Sfoglia il catalogo con i tuoi prezzi e spedizione dedicata.
        </p>
        <button className="btn btn-primary" onClick={onOpenLogin}>
          Vai al catalogo
        </button>
      </div>
    </section>
  );
}
