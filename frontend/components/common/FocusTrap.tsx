"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function FocusTrap({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const focusable = (el: Element): el is HTMLElement =>
      el instanceof HTMLElement &&
      el.tabIndex >= 0 &&
      !el.hasAttribute("disabled");
    function trap(e: KeyboardEvent) {
      if (e.key !== "Tab" || !root) return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>("*")).filter(focusable);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, []);

  return <div ref={rootRef}>{children}</div>;
}
