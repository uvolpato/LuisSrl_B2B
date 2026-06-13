"use client";

import { useState } from "react";
import LandingNav from "../components/landing/LandingNav";
import HeroSection from "../components/landing/HeroSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import AiSearchSection from "../components/landing/AiSearchSection";
import StatsSection from "../components/landing/StatsSection";
import LineeSection from "../components/landing/LineeSection";
import CtaSection from "../components/landing/CtaSection";
import PublicFooter from "../components/landing/PublicFooter";
import LoginModal from "../components/common/LoginModal";

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="landing">
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999, background: "oklch(30% 0.02 60)", color: "oklch(92% 0.01 80)", textAlign: "center", padding: "6px 16px", fontSize: 12, fontFamily: "var(--font-body)", letterSpacing: "0.02em" }}>
        ⚠ Prototipo dimostrativo — non è un&apos;applicazione reale. Tutti i dati sono fittizi e qualcosa potrebbe non funzionare correttamente.
      </div>
      <LandingNav onOpenLogin={() => setShowLogin(true)} />
      <main id="content">
        <HeroSection onOpenLogin={() => setShowLogin(true)} />
        <FeaturesSection />
        <AiSearchSection />
        <StatsSection />
        <LineeSection />
        <CtaSection onOpenLogin={() => setShowLogin(true)} />
      </main>
      <PublicFooter />
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
