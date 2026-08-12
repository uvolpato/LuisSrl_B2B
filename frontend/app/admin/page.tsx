"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import "./admin.css";
import { useAuth } from "../../lib/use-auth";
import LoadingScreen from "../../components/common/LoadingScreen";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPanel from "../../components/admin/AdminPanel";
import ArticoliSection from "../../components/admin/sections/ArticoliSection";
import ClientiSection from "../../components/admin/sections/ClientiSection";
import RaccolteSection from "../../components/admin/sections/RaccolteSection";
import BoxSuggerimentiSection from "../../components/admin/sections/BoxSuggerimentiSection";
import FamiglieSection from "../../components/admin/sections/FamiglieSection";
import ListiniSection from "../../components/admin/sections/ListiniSection";
import SpeseSpedizioneSection from "../../components/admin/sections/SpeseSpedizioneSection";
import AdminOrdiniSection from "../../components/admin/sections/AdminOrdiniSection";
import CouponSection from "../../components/admin/sections/CouponSection";
import EventLogSection from "../../components/admin/sections/EventLogSection";

const SECTION_TITLES: Record<string, string> = {
  clienti: "Gestione Clienti",
  articoli: "Gestione Articoli",
  famiglie: "Famiglie (da Integra)",
  raccolte: "Raccolte di portale",
  "box-dashboard": "Box dashboard cliente",
  listini: "Listini",
  ordini: "Ordini",
  coupon: "Coupon e campagne",
  "admin-panel": "Pannello di Amministrazione",
  "spese-spedizione": "Spese di spedizione",
};

export default function AdminPage() {
  const t = useTranslations("admin");
  const { user: admin, loading, setUser } = useAuth("admin");
  const [section, setSection] = useState("articoli");

  if (loading || !admin || admin.userType !== "admin") return <LoadingScreen />;

  return (
    <AdminLayout
      activeSection={section}
      onSectionChange={setSection}
      user={admin}
      onUserUpdate={setUser}
    >
      {section === "articoli" && <ArticoliSection />}
      {section === "clienti" && <ClientiSection />}
      {section === "admin-panel" && <AdminPanel />}

      {section === "famiglie" && <FamiglieSection />}

      {section === "raccolte" && <RaccolteSection />}

      {section === "box-dashboard" && <BoxSuggerimentiSection />}

      {section === "listini" && <ListiniSection />}
      {section === "ordini" && <AdminOrdiniSection />}
      {section === "coupon" && <CouponSection />}
      {section === "log-eventi" && <EventLogSection />}
      {section === "spese-spedizione" && <SpeseSpedizioneSection />}
    </AdminLayout>
  );
}
