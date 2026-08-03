"use client";
import { HeaderCenterProvider } from "../../contexts/HeaderCenterContext";
import AreaHeader from "../../components/area/AreaHeader";
import AreaFooter from "../../components/area/AreaFooter";
import Tracker from "../../components/area/Tracker";

export default function AreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <HeaderCenterProvider>
      <Tracker />
      <AreaHeader />
      {children}
      <AreaFooter />
    </HeaderCenterProvider>
  );
}
