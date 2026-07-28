"use client";
import { createContext, useContext, useState, type ReactNode } from "react";

type HeaderCenterContextType = {
  content: ReactNode;
  setContent: (node: ReactNode) => void;
};

const HeaderCenterContext = createContext<HeaderCenterContextType>({ content: null, setContent: () => {} });

export function HeaderCenterProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode>(null);
  return (
    <HeaderCenterContext.Provider value={{ content, setContent }}>
      {children}
    </HeaderCenterContext.Provider>
  );
}

export function useHeaderCenter() {
  return useContext(HeaderCenterContext);
}
