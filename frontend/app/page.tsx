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
