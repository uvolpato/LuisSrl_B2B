"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

/**
 * Colonna tabellare ridimensionabile trascinando un handle nel header.
 * La larghezza e' persistita in localStorage: riaprendo la sezione la
 * colonna mantiene la misura scelta. Spec spese-spedizione.md §5.2/§11.4.
 */
export function useResizableColumn({
  storageKey,
  minWidth = 140,
  defaultWidth,
}: {
  storageKey: string;
  minWidth?: number;
  defaultWidth: number;
}) {
  const [width, setWidth] = useState<number>(defaultWidth);
  const drag = useRef<{ startX: number; startW: number } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const w = parseFloat(saved);
        if (!isNaN(w) && w >= minWidth) setWidth(w);
      }
    } catch {
      /* storage non disponibile: si parte dal default */
    }
  }, [storageKey, minWidth]);

  function onPointerDown(e: PointerEvent<HTMLSpanElement>) {
    const handle = e.currentTarget;
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startW: width };
    handle.classList.add("dragging");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMove(ev: globalThis.PointerEvent) {
      if (!drag.current) return;
      setWidth(Math.max(minWidth, drag.current.startW + (ev.clientX - drag.current.startX)));
    }

    function onUp(ev: globalThis.PointerEvent) {
      const el = ev.currentTarget as HTMLSpanElement;
      el.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      if (drag.current) {
        const w = Math.max(minWidth, drag.current.startW + (ev.clientX - drag.current.startX));
        try {
          localStorage.setItem(storageKey, String(w));
        } catch {
          /* persistenza non disponibile */
        }
        drag.current = null;
      }
    }

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
  }

  return { width, onPointerDown };
}
