"use client";

export default function LandingNav({ onOpenLogin }: { onOpenLogin: () => void }) {
  return (
    <header className="topnav" data-od-id="topnav">
      <div className="container topnav-inner">
        <a href="/" className="logo">
          <img src="/images/b2b/logo.webp" alt="Luis S.r.l." />
        </a>
        <nav />
        <div className="row" style={{ gap: 12 }}>
          <button
            className="btn btn-secondary"
            style={{ padding: "8px 18px", fontSize: 13 }}
            onClick={onOpenLogin}
          >
            Accedi
          </button>
        </div>
      </div>
    </header>
  );
}
