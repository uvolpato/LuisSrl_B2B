"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, setCsrfToken } from "../../lib/api";
import { useAuth } from "../../lib/use-auth";
import type { CustomerProfile } from "../../lib/types";

const MOBILE_BP = "(max-width: 768px)";

const INITIALS_CSS = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0]).toUpperCase();
};

export default function AreaHeader({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth("customer");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCompact, setCompact] = useState(false);
  const [cartCount, setCartCount] = useState<number | null>(null);

  const fetchCartCount = useCallback(() => {
    api.get<{ count: number }>("/api/carrello/count").then((r) => setCartCount(r.count)).catch(() => setCartCount(0));
  }, []);

  useEffect(() => { fetchCartCount(); }, [fetchCartCount]);

  useEffect(() => {
    const handler = () => fetchCartCount();
    window.addEventListener("cart-updated", handler);
    return () => window.removeEventListener("cart-updated", handler);
  }, [fetchCartCount]);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  // Stable breakpoint via matchMedia — no ResizeObserver flicker
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_BP);
    setCompact(mql.matches);
    const onChange = (e: MediaQueryListEvent) => {
      setCompact(e.matches);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Close user dropdown when going compact
  useEffect(() => {
    if (isCompact) setMenuOpen(false);
  }, [isCompact]);

  // Close mobile drawer on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: MouseEvent) => {
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileOpen]);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Close user dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      setCsrfToken(null);
      router.replace("/");
    }
  }, [router]);

  const c = user as CustomerProfile | undefined;
  const initials = c ? INITIALS_CSS(c.nome) : "";
  const nomeCompleto = c?.nome ?? "";
  const email = c?.email ?? "";

  return (
    <>
      <style>{`
        .area-header {
          position: sticky; top: 0; z-index: 100;
          background: color-mix(in oklch, var(--bg) 92%, transparent);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
        }
        .area-header-inner {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: 14px 20px;
          gap: 12px;
          overflow: visible;
        }
        .area-header-inner.compact {
          padding: 14px 8px;
        }
        .area-header .logo img { height: 32px; width: auto; display: block; }

        /* Logo wrap: hamburger + logo with animated shift */
        .area-header .logo-wrap {
          display: flex; align-items: center; gap: 0; flex-shrink: 0;
          transition: transform 0.3s ease;
        }
        .area-header .logo-wrap.compact {
          transform: translateX(0);
        }
        .area-header .logo-wrap .hamburger-btn {
          max-width: 34px; opacity: 1; margin-right: 10px; overflow: hidden;
          transition: max-width 0.3s ease, opacity 0.25s ease, margin-right 0.3s ease, padding 0.3s ease;
        }
        .area-header .logo-wrap:not(.compact) .hamburger-btn {
          max-width: 0; opacity: 0; margin-right: 0; padding: 6px 0;
          pointer-events: none;
        }

        .area-header .header-right {
          display: flex; align-items: center; gap: 20px; flex-shrink: 0; margin-left: auto;
        }
        .area-header .header-center {
          flex: 1;
          display: flex;
          justify-content: center;
          margin: 0 20px;
          min-width: 0;
        }
        .area-header .header-center > * {
          max-width: 480px;
          width: 100%;
        }
        .area-header nav { display: flex; gap: 20px; align-items: center; white-space: nowrap; }
        /* display:none (non absolute) così il nav non sfora a destra su mobile.
           isCompact deriva da matchMedia, non da misurazione: sicuro nasconderlo. */
        .area-header nav.nav-hidden { display: none; }
        .area-header nav a { font-size: 14px; color: var(--muted); text-decoration: none; transition: color 0.15s; }
        .area-header nav a:hover { color: var(--fg); }
        .area-header nav a.active { color: var(--fg); font-weight: 500; }

        .area-header .avatar-circle {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: var(--accent-soft);
          border: 1px solid var(--border);
          display: grid;
          place-items: center;
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--accent);
          font-weight: 600;
          flex-shrink: 0;
        }
        .area-header .user-menu-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          z-index: 101;
          min-width: 220px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0,0,0,.12);
          overflow: hidden;
        }
        .area-header .user-menu-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
        }
        .area-header .user-menu-divider {
          height: 1px;
          background: var(--border);
          margin: 0;
        }
        .area-header .user-menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 11px 16px;
          border: none;
          background: transparent;
          color: var(--fg);
          font-family: var(--font-body);
          font-size: 14px;
          cursor: pointer;
          text-align: left;
          transition: background 0.12s;
        }
        .area-header .user-menu-item:hover {
          background: var(--accent-soft);
        }
        .area-header .user-menu-item svg {
          color: var(--muted);
        }

        /* Hamburger button */
        .area-header .hamburger-btn {
          background: none; border: none;
          padding: 6px; cursor: pointer;
          color: var(--fg); border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.12s;
        }
        .area-header .hamburger-btn:hover { background: var(--accent-soft); }
        .area-header .cart-btn-text { display: inline; }
        @media (max-width: 768px) {
          .area-header .cart-btn-text { display: none; }
        }

        /* Mobile overlay */
        .mobile-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.4);
          opacity: 0; pointer-events: none;
          transition: opacity 0.2s;
        }
        .mobile-overlay.open { opacity: 1; pointer-events: auto; }

        /* Mobile drawer */
        .mobile-drawer {
          position: fixed; top: 0; left: 0; bottom: 0;
          z-index: 201; width: 280px; max-width: 80vw;
          background: var(--surface);
          border-right: 1px solid var(--border);
          box-shadow: 4px 0 24px rgba(0,0,0,.1);
          transform: translateX(-100%);
          transition: transform 0.25s ease;
          overflow-y: auto;
          display: flex; flex-direction: column;
        }
        .mobile-drawer.open { transform: translateX(0); }

        .mobile-drawer-header {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .mobile-drawer-header .logo img { height: 28px; width: auto; display: block; }

        .mobile-drawer-close {
          background: none; border: none;
          padding: 6px; cursor: pointer;
          color: var(--fg); border-radius: 6px;
          display: flex;
        }
        .mobile-drawer-close:hover { background: var(--accent-soft); }

        .mobile-nav {
          display: flex; flex-direction: column;
          padding: 8px 0; flex: 1;
        }
        .mobile-nav a {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 20px; font-size: 15px;
          color: var(--fg); text-decoration: none;
          transition: background 0.12s;
        }
        .mobile-nav a:hover { background: var(--accent-soft); }
        .mobile-nav a.active {
          background: var(--accent-soft);
          font-weight: 600; color: var(--accent);
        }
        .mobile-nav a svg { color: var(--muted); flex-shrink: 0; }

        .mobile-children {
          padding: 16px 20px;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
        }

        .mobile-drawer-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 20px;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
        }
        .mobile-drawer-user-avatar {
          width: 34px; height: 34px;
          border-radius: 50%;
          background: var(--accent-soft);
          border: 1px solid var(--border);
          display: grid;
          place-items: center;
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--accent);
          font-weight: 600;
          flex-shrink: 0;
        }
        .mobile-drawer-user-info {
          flex: 1;
          min-width: 0;
        }
        .mobile-drawer-user-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--fg);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mobile-drawer-user-email {
          font-size: 12px;
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mobile-drawer-logout {
          background: none; border: none;
          padding: 8px; cursor: pointer;
          color: var(--muted);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: color 0.12s, background 0.12s;
        }
        .mobile-drawer-logout:hover {
          color: var(--fg);
          background: var(--accent-soft);
        }
      `}</style>

      <header className="area-header">
        <div className={`area-header-inner${isCompact ? " compact" : ""}`}>
          <div className={`logo-wrap${isCompact ? " compact" : ""}`}>
            <button
              className="hamburger-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Apri menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <Link href="/area" className="logo">
              <img src="/images/b2b/logo.webp" alt="Luis S.r.l." />
            </Link>
          </div>

          {children && <div className="header-center">{children}</div>}

          <div className="header-right">
            <nav className={isCompact ? "nav-hidden" : ""}>
              <Link href="/area" className={pathname === "/area" ? "active" : ""}>Dashboard</Link>
              <Link href="/area/catalogo" className={pathname.startsWith("/area/catalogo") ? "active" : ""}>Catalogo</Link>
              <Link href="/area/ordini" className={pathname.startsWith("/area/ordini") ? "active" : ""}>Ordini</Link>
            </nav>

            <Link
              href="/area/carrello"
              className="btn btn-secondary cart-btn"
              style={{
                padding: "8px 14px", fontSize: 13, textDecoration: "none",
                borderRadius: 10, border: "1px solid var(--border)",
                color: "var(--fg)", display: "inline-flex", alignItems: "center", gap: 6,
                whiteSpace: "nowrap",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              <span className="cart-btn-text">Carrello</span>
              <span>({cartCount !== null ? cartCount : "…"})</span>
            </Link>
            {c && (
              <div
                ref={menuRef}
                style={{
                  position: "relative",
                  display: isCompact ? "none" : "block",
                }}
              >
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    cursor: "pointer", userSelect: "none",
                  }}
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <div className="avatar-circle">{initials}</div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--muted)" }}>
                    {nomeCompleto}
                  </span>
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    style={{
                      color: "var(--muted)", transition: "transform 0.15s",
                      transform: menuOpen ? "rotate(180deg)" : "none",
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {menuOpen && (
                  <div className="user-menu-dropdown">
                    <div className="user-menu-header">
                      <div className="avatar-circle" style={{ width: 36, height: 36, fontSize: 14 }}>
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>{nomeCompleto}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{email}</div>
                      </div>
                    </div>
                    <div className="user-menu-divider" />
                    <Link href="/area/profilo" className="user-menu-item" onClick={() => setMenuOpen(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Profilo
                    </Link>
                    <button className="user-menu-item" onClick={logout}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Esci
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </header>

      {/* Mobile overlay + drawer — outside header to avoid backdrop-filter containing block */}
      <div
        className={`mobile-overlay${mobileOpen ? " open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />
      <div ref={mobileRef} className={`mobile-drawer${mobileOpen ? " open" : ""}`}>
        <div className="mobile-drawer-header">
          <Link href="/area" className="logo" onClick={() => setMobileOpen(false)}>
            <img src="/images/b2b/logo.webp" alt="Luis S.r.l." />
          </Link>
          <button className="mobile-drawer-close" onClick={() => setMobileOpen(false)} aria-label="Chiudi menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="mobile-nav">
          <Link href="/area" className={pathname === "/area" ? "active" : ""} onClick={() => setMobileOpen(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
            Dashboard
          </Link>
          <Link href="/area/catalogo" className={pathname.startsWith("/area/catalogo") ? "active" : ""} onClick={() => setMobileOpen(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            Catalogo
          </Link>
            <Link href="/area/ordini" className={pathname.startsWith("/area/ordini") ? "active" : ""} onClick={() => setMobileOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Ordini
            </Link>
            <Link href="/area/carrello" className={pathname.startsWith("/area/carrello") ? "active" : ""} onClick={() => setMobileOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              Carrello {cartCount !== null ? `(${cartCount})` : ""}
            </Link>
            <Link href="/area/profilo" className={pathname.startsWith("/area/profilo") ? "active" : ""} onClick={() => setMobileOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Profilo
            </Link>
          </div>
        {c && isCompact && (
          <div className="mobile-drawer-user">
            <div className="mobile-drawer-user-avatar">{initials}</div>
            <div className="mobile-drawer-user-info">
              <div className="mobile-drawer-user-name">{nomeCompleto}</div>
              <div className="mobile-drawer-user-email">{email}</div>
            </div>
            <button className="mobile-drawer-logout" onClick={logout} title="Esci">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}
        {children && <div className="mobile-children">{children}</div>}
      </div>
    </>
  );
}
