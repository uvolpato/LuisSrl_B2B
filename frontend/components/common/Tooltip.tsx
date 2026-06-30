"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  text: string;
  children: ReactNode;
}

export default function Tooltip({ text, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ display: "none" });

  useEffect(() => {
    if (visible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setStyle({
        position: "fixed",
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
        transform: "translate(-50%, -100%)",
        background: "oklch(18% 0.02 250)",
        color: "oklch(96% 0.005 250)",
        fontFamily: "var(--font-body)",
        fontSize: 12,
        lineHeight: 1.4,
        padding: "8px 12px",
        borderRadius: 8,
        maxWidth: 280,
        whiteSpace: "normal" as const,
        wordWrap: "break-word" as const,
        zIndex: 9999,
        pointerEvents: "none" as const,
        boxShadow: "0 4px 12px oklch(0% 0 0 / 0.25)",
        display: "block",
      });
    } else {
      setStyle((s) => ({ ...s, display: "none" }));
    }
  }, [visible]);

  return (
    <span
      ref={triggerRef}
      style={{ display: "inline-flex" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && typeof document !== "undefined" && createPortal(
        <span style={style} role="tooltip">{text}</span>,
        document.body,
      )}
    </span>
  );
}
