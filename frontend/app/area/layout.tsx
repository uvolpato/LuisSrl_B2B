"use client";
import { HeaderCenterProvider } from "../../contexts/HeaderCenterContext";
import AreaHeader from "../../components/area/AreaHeader";
import AreaFooter from "../../components/area/AreaFooter";

export default function AreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <HeaderCenterProvider>
      <AreaHeader />
      {children}
      <AreaFooter />
    </HeaderCenterProvider>
  );
}
