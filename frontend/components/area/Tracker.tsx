"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "../../lib/use-auth";
import { api } from "../../lib/api";

interface ClientEvent { tipo: string; entita?: string; entitaId?: string; dettagli?: unknown }

/**
 * Tracciamento leggero lato browser: page.view, tempo su pagina (page.leave),
 * profondità di scroll. Solo per i clienti loggati. Invia in batch via /api/eventi.
 */
export default function Tracker() {
  const pathname = usePathname();
  const { user } = useAuth("customer");
  const isCustomer = user?.userType === "customer";

  const queue = useRef<ClientEvent[]>([]);
  const enterTs = useRef<number>(Date.now());
  const scrollDone = useRef<Set<number>>(new Set());
  const lastPath = useRef<string>("");

  function flush() {
    if (!queue.current.length) return;
    const eventi = queue.current;
    queue.current = [];
    void api.post("/api/eventi", { eventi }).catch(() => { /* best-effort */ });
  }

  // Cambio pagina: chiudi la precedente (tempo) e apri la nuova.
  useEffect(() => {
    if (!isCustomer) return;
    if (lastPath.current) {
      const sec = Math.round((Date.now() - enterTs.current) / 1000);
      if (sec > 0) queue.current.push({ tipo: "page.leave", dettagli: { path: lastPath.current, sec } });
    }
    queue.current.push({ tipo: "page.view", dettagli: { path: pathname } });
    lastPath.current = pathname;
    enterTs.current = Date.now();
    scrollDone.current = new Set();
    flush();
  }, [pathname, isCustomer]);

  // Scroll depth 25/50/75/100.
  useEffect(() => {
    if (!isCustomer) return;
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      if (max <= 0) return;
      const pct = Math.round((h.scrollTop / max) * 100);
      for (const t of [25, 50, 75, 100]) {
        if (pct >= t && !scrollDone.current.has(t)) {
          scrollDone.current.add(t);
          queue.current.push({ tipo: "scroll.depth", dettagli: { path: pathname, pct: t } });
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname, isCustomer]);

  // Alla chiusura/uscita pagina: registra il tempo e svuota la coda.
  useEffect(() => {
    if (!isCustomer) return;
    const onHide = () => {
      const sec = Math.round((Date.now() - enterTs.current) / 1000);
      if (sec > 0) queue.current.push({ tipo: "page.leave", dettagli: { path: lastPath.current, sec } });
      flush();
    };
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") onHide(); });
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [isCustomer]);

  return null;
}
