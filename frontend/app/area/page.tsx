"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "../../lib/use-auth";
import LoadingScreen from "../../components/common/LoadingScreen";
import ChangePasswordCard from "../../components/auth/ChangePasswordCard";

import AiSearchModal from "../../components/area/AiSearchModal";
import ClearButton from "../../components/common/ClearButton";
import { api } from "../../lib/api";
import type { CustomerProfile } from "../../lib/types";

function SparkleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z" />
    </svg>
  );
}

function SearchIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function GridIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

const PRODUCT_BOXES = [
  {
    title: "Riprendi da dove hai lasciato",
    images: ["catalogo-cotto-esterni.webp", "catalogo-fiberstone.webp", "catalogo-cesti.webp", "catalogo-metallo.webp"],
  },
  {
    title: "I tuoi prodotti in offerta",
    images: ["catalogo-cotto-interni.webp", "vasi-bianchi.webp", "catalogo-capi-europe.webp", "catalogo-pottery-pots.webp"],
  },
  {
    title: "Offerte relative ai prodotti salvati",
    images: ["catalogo-metallo.webp", "catalogo-cesti.webp", "catalogo-fiberstone.webp", "catalogo-cotto-esterni.webp"],
  },
  {
    title: "Offerte Top",
    images: ["catalogo-capi-europe.webp", "catalogo-pottery-pots.webp", "vasi-bianchi.webp", "catalogo-fiberstone.webp"],
  },
  {
    title: "Offerte di oggi",
    images: ["catalogo-cotto-interni.webp", "catalogo-cesti.webp", "catalogo-metallo.webp", "catalogo-cotto-esterni.webp"],
  },
  {
    title: "Offerte stagionali",
    images: ["catalogo-cotto-esterni.webp", "catalogo-fiberstone.webp", "catalogo-pottery-pots.webp", "catalogo-cesti.webp"],
  },
];

export default function AreaClientePage() {
  const t = useTranslations("area");
  const tc = useTranslations("common");
  const router = useRouter();
  const { user, loading, setUser } = useAuth("customer");

  const [activeTab, setActiveTab] = useState(0);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [heroSearch, setHeroSearch] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  // Le tab sono l'ambito della ricerca testuale della barra.
  const SCOPES = [
    { label: "Catalogo", href: "/area/catalogo", placeholder: "Cerca vasi, materiali o linee…" },
    { label: "Ordini", href: "/area/ordini", placeholder: "Cerca nei tuoi ordini…" },
    { label: "Progetti", href: "/area/progetti", placeholder: "Cerca nei tuoi progetti…" },
  ];
  const tabs = SCOPES.map((s) => s.label);

  const openAiModal = () => setAiModalOpen(true);
  const closeAiModal = () => setAiModalOpen(false);

  // Ricerca testuale: va alla sezione dell'ambito selezionato con ?q=.
  const doTextSearch = () => {
    const q = heroSearch.trim();
    if (!q) return;
    router.push(`${SCOPES[activeTab].href}?q=${encodeURIComponent(q)}`);
  };

  // La ricerca AI vera vive nel catalogo: navighiamo lì con la query, che il
  // catalogo esegue e conserva nell'URL (torna-indietro riporta ai risultati).
  const handleSearchAi = (query: string) => {
    closeAiModal();
    router.push(`/area/catalogo?ai=${encodeURIComponent(query)}`);
  };

  // Ricerca per immagine: eseguita qui, risultati passati al catalogo via
  // sessionStorage (un file non si può mettere nell'URL). Stessa modale del catalogo.
  const handleImageSearch = async (file: File) => {
    setAiLoading(true); setAiError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<{ articoli: unknown[]; error?: string }>("/api/catalogo/ricerca-immagine", fd);
      if (res.error) {
        setAiError("Non ho riconosciuto un prodotto nell'immagine. Prova con un'altra foto.");
        return;
      }
      sessionStorage.setItem("ai-image-results", JSON.stringify(res.articoli));
      closeAiModal();
      router.push("/area/catalogo?imgsearch=1");
    } catch {
      setAiError("Ricerca non riuscita. Riprova.");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading || !user || user.userType !== "customer") return <LoadingScreen />;

  const c = user as CustomerProfile;
  const firstName = c.nome.split(/\s+/)[0];

  const img = (name: string) => `/images/b2b/${name}`;

  return (
    <>
      <style>{`
        .dash-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: clamp(48px, 8vw, 80px);
          padding-bottom: clamp(48px, 8vw, 80px);
        }
        .dash-welcome { text-align: center; margin-bottom: var(--gap-lg, 20px); }
        .dash-welcome h1 {
          font-family: var(--font-display);
          font-size: clamp(28px, 3.5vw, 40px);
          line-height: 1.1;
          letter-spacing: -0.02em;
          margin: 0 0 6px;
        }
        .dash-welcome p { margin: 0; color: var(--muted); font-size: 16px; }

        .dash-search-bar {
          width: 100%;
          max-width: 580px;
          position: relative;
          margin-bottom: var(--gap-md, 20px);
        }
        .dash-search-bar input {
          width: 100%;
          padding: 14px 84px 14px 48px;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg, 16px);
          background: var(--surface);
          font-family: var(--font-body);
          font-size: 15px;
          color: var(--fg);
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .dash-search-bar input::placeholder { color: var(--muted); }
        .dash-search-bar input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-soft);
        }
        .dash-search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted);
          background: none;
          border: none;
          padding: 6px;
          display: grid;
          place-items: center;
          cursor: pointer;
          border-radius: 8px;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .dash-search-icon:hover { color: var(--accent); background: var(--accent-soft); }
        .dash-ai-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: none;
          background: var(--accent);
          color: #fff;
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease;
          padding: 0;
        }
        .dash-ai-btn:hover { background: color-mix(in oklch, var(--accent) 85%, black); }
        .dash-ai-btn:active { transform: translateY(-50%) scale(0.95); }

        .dash-tabs {
          display: flex;
          gap: 4px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius, 12px);
          padding: 4px;
          margin-bottom: clamp(32px, 5vw, 56px);
        }
        .dash-tab {
          padding: 8px 20px;
          border-radius: calc(var(--radius, 12px) - 2px);
          border: none;
          background: transparent;
          font-family: var(--font-body);
          font-size: 14px;
          font-weight: 500;
          color: var(--muted);
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .dash-tab:hover { color: var(--fg); }
        .dash-tab.active { background: var(--accent); color: #fff; }

        .action-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--gap-lg, 32px);
          width: 100%;
          max-width: 860px;
        }
        @media (max-width: 780px) {
          .action-grid { grid-template-columns: 1fr; }
        }
        .action-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg, 16px);
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          text-decoration: none;
          color: inherit;
          cursor: pointer;
          transition: border-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
          text-align: left;
          font: inherit;
        }
        .action-card:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px color-mix(in oklch, var(--accent) 10%, transparent);
        }
        .action-card .card-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: var(--accent-soft);
          display: grid;
          place-items: center;
          color: var(--accent);
          margin-bottom: 4px;
        }
        .action-card h3 {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 600;
          line-height: 1.2;
          letter-spacing: -0.01em;
          margin: 0;
        }
        .action-card p {
          margin: 0;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.5;
          flex: 1;
        }
        .action-card .card-link {
          font-size: 14px;
          font-weight: 500;
          color: var(--accent);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
        }
        .action-card .card-link::after { content: '→'; transition: transform 0.15s ease; }
        .action-card:hover .card-link::after { transform: translateX(3px); }

        .product-boxes {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: clamp(20px, 3vw, 32px);
          margin-top: clamp(32px, 5vw, 56px);
        }
        @media (max-width: 720px) {
          .product-boxes { grid-template-columns: 1fr; }
        }
        .product-box {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg, 16px);
          padding: 24px;
        }
        .product-box-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--gap-md, 20px);
        }
        .product-box-header h2 {
          font-family: var(--font-display);
          font-size: 18px;
          margin: 0;
          letter-spacing: -0.01em;
        }
        .product-box-header a {
          font-size: 13px;
          font-weight: 500;
          color: var(--accent);
          display: inline-flex;
          align-items: center;
          gap: 4px;
          text-decoration: none;
        }
        .product-box-header a::after { content: '→'; transition: transform 0.15s ease; }
        .product-box-header a:hover::after { transform: translateX(2px); }
        .product-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          border-radius: var(--radius, 12px);
          overflow: hidden;
        }
        .product-mini {
          display: block;
          text-decoration: none;
          color: inherit;
          position: relative;
          overflow: hidden;
        }
        .product-mini:hover { opacity: 0.85; }
        .product-mini-img {
          width: 100%;
          aspect-ratio: 1;
          object-fit: cover;
          background: var(--fg-soft, color-mix(in oklch, var(--fg) 6%, transparent));
          display: block;
        }
        .dash-bottom-cta {
          margin-top: clamp(32px, 5vw, 56px);
          text-align: center;
        }

        .modal-overlay {
          display: ${aiModalOpen ? "flex" : "none"};
          position: fixed;
          inset: 0;
          z-index: 100;
          background: color-mix(in oklch, var(--fg) 40%, transparent);
          backdrop-filter: blur(4px);
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .ai-modal {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 24px 64px color-mix(in oklch, var(--fg) 18%, transparent);
          animation: modalIn 0.18s ease-out;
        }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px 0;
        }
        .modal-head h3 {
          font-family: var(--font-display);
          font-size: 20px;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ai-badge {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.04em;
          background: var(--accent-soft);
          color: var(--accent);
          padding: 3px 8px;
          border-radius: 999px;
          font-weight: 600;
        }
        .modal-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: background 0.12s ease, color 0.12s ease;
          padding: 0;
          line-height: 0;
        }
        .modal-close-btn:hover { background: var(--fg-soft, color-mix(in oklch, var(--fg) 6%, transparent)); color: var(--fg); }
        .modal-close-btn svg { display: block; }
        .modal-body { padding: 20px 24px 24px; }
        .modal-foot {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 16px 24px;
          border-top: 1px solid var(--border);
        }
        .ai-search-desc {
          font-size: 14px;
          color: var(--muted);
          margin: 0 0 18px;
        }
        .ai-search-input-wrap {
          position: relative;
          margin-bottom: 14px;
        }
        .ai-search-input-wrap input {
          width: 100%;
          padding: 14px 48px 14px 44px;
          border: 1.5px solid var(--border);
          border-radius: var(--radius, 12px);
          background: var(--bg);
          font: inherit;
          font-size: 15px;
          color: var(--fg);
          transition: border-color 0.15s ease;
        }
        .ai-search-input-wrap input:focus {
          outline: none;
          border-color: var(--accent);
        }
        .ai-search-input-wrap input::placeholder { color: var(--muted); }
        .ai-search-input-wrap .ai-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          color: var(--muted);
        }
        .ai-upload-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .ai-upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
          padding: 10px 18px;
          border: 1.5px dashed var(--border);
          border-radius: var(--radius, 12px);
          background: transparent;
          font-size: 13px;
          font-weight: 500;
          color: var(--muted);
          cursor: pointer;
          transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
          position: relative;
          overflow: hidden;
        }
        .ai-upload-btn input[type="file"] {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
        }
        .ai-upload-btn:hover {
          background: var(--fg);
          color: var(--surface);
        }
        .ai-upload-btn.drag-over {
          background: var(--accent);
          color: var(--surface);
          border-style: solid;
          border-color: var(--accent);
        }
        .ai-search-hint {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 16px;
          font-size: 13px;
          color: var(--muted);
        }
        .ai-tag {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid var(--border);
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--muted);
          cursor: pointer;
          transition: border-color 0.12s ease, color 0.12s ease;
          background: none;
        }
        .ai-tag:hover { border-color: var(--accent); color: var(--accent); }



        .user-menu-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          z-index: 100;
          min-width: 220px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0,0,0,.12);
          overflow: hidden;
        }
        @media (max-width: 600px) {
          .ai-upload-row { flex-direction: column; }
          .ai-modal { max-width: 100%; margin: 12px; border-radius: 12px; }
        }

        .dash-main .container { max-width: 960px; padding-inline: 32px; }
        @media (max-width: 640px) {
          .dash-main .container { padding-inline: 16px; }
          .dash-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: thin; }
          .dash-tab { flex-shrink: 0; }
          .dash-search-bar { max-width: 100%; }
        }
      `}</style>

      {/* Main content */}
      <div id="content" className="dash-main">
        <div className="container" style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>

          {/* Welcome */}
          <div className="dash-welcome">
            <h1>Bentornato, {firstName}</h1>
            <p>Cosa vuoi fare oggi?</p>
          </div>

          {/* Password change */}
          {c.mustChangePassword && (
            <div style={{ width: "100%", maxWidth: 580, marginBottom: 20 }}>
              <div className="warn-box" style={{ margin: 0, marginBottom: 12 }}>
                {t("mustChange")}
              </div>
              <ChangePasswordCard
                onChanged={() => setUser({ ...c, mustChangePassword: false })}
              />
            </div>
          )}

          {!c.mustChangePassword && (
            <>
              {/* Search bar */}
              <div className="dash-search-bar">
                <button type="button" className="dash-search-icon" onClick={doTextSearch} title="Cerca" aria-label="Cerca"><SearchIcon /></button>
                <input
                  type="text"
                  placeholder={SCOPES[activeTab].placeholder}
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") doTextSearch(); }}
                />
                {heroSearch && (
                  <ClearButton onClear={() => setHeroSearch("")} style={{ position: "absolute", right: 52, top: "50%", transform: "translateY(-50%)", borderRadius: 6 }} />
                )}
                <button className="dash-ai-btn" onClick={openAiModal} title="Ricerca intelligente AI" aria-label="Ricerca intelligente AI">
                  <SparkleIcon size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="dash-tabs">
                {tabs.map((tab, i) => (
                  <button key={tab} className={`dash-tab${i === activeTab ? " active" : ""}`} onClick={() => setActiveTab(i)}>
                    {tab}
                  </button>
                ))}
              </div>

              {/* Action cards */}
              <div className="action-grid">
                <Link href="/area/famiglie" className="action-card">
                  <span className="card-icon"><SearchIcon size={22} /></span>
                  <h3>Esplora il Catalogo</h3>
                  <p>Sfoglia l'intero catalogo con filtri per linea, famiglia, prezzo e disponibilità a magazzino.</p>
                  <span className="card-link">Vai al catalogo</span>
                </Link>
                <button className="action-card" onClick={openAiModal}>
                  <div className="card-icon"><SparkleIcon size={22} /></div>
                  <h3>Ricerca intelligente con AI</h3>
                  <p>Carica un'immagine o descrivi ciò che cerchi per trovare in modo intelligente tra tutti i prodotti.</p>
                  <span className="card-link">Prova la ricerca AI</span>
                </button>
                <Link href="/area/famiglie" className="action-card">
                  <div className="card-icon"><GridIcon /></div>
                  <h3>Le nostre Linee</h3>
                  <p>Scopri il catalogo diviso per linea e famiglia di prodotto: Cotto, Fiberstone, Metallo e altre.</p>
                  <span className="card-link">Esplora le linee</span>
                </Link>
              </div>

              {/* Product boxes */}
              <div className="product-boxes">
                {PRODUCT_BOXES.map((box, bi) => (
                  <div className="product-box" key={bi}>
                    <div className="product-box-header">
                      <h2>{box.title}</h2>
                      <Link href="/area/famiglie">Vedi tutto</Link>
                    </div>
                    <div className="product-grid">
                      {box.images.map((src, ii) => (
                        <Link key={ii} href="/area/famiglie" className="product-mini">
                          <img className="product-mini-img" src={img(src)} alt={box.title} />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom CTA */}
              {activeTab !== 0 && (
                <div className="dash-bottom-cta">
                  <Link
                    href="/area/famiglie"
                    className="btn btn-primary"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "11px 20px", borderRadius: 10,
                      background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)",
                      fontSize: 15, fontWeight: 500, textDecoration: "none",
                    }}
                  >
                    Vai al catalogo
                  </Link>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      <AiSearchModal open={aiModalOpen} onClose={closeAiModal} onSubmit={handleSearchAi} onSubmitImage={handleImageSearch} loading={aiLoading} error={aiError} />
    </>
  );
}
