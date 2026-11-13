"use client";
import { HeaderCenterProvider } from "../../contexts/HeaderCenterContext";
import AreaHeader from "../../components/area/AreaHeader";
import AreaFooter from "../../components/area/AreaFooter";
import Tracker from "../../components/area/Tracker";
import PrivacyNoticeModal from "../../components/area/PrivacyNoticeModal";

export default function AreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <HeaderCenterProvider>
      <Tracker />
      <PrivacyNoticeModal />
      <AreaHeader />
      {children}
      <AreaFooter />
    </HeaderCenterProvider>
  );
}
