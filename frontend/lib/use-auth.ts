"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setCsrfToken } from "./api";
import type { MeResponse, UserProfile } from "./types";

/**
 * Ripristina la sessione (utente + token CSRF) e applica il controllo ruolo.
 * Reindirizza a /login se non autenticato, alla home giusta se ruolo errato.
 */
export function useAuth(requiredRole?: "ADMIN" | "CLIENTE") {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get<MeResponse>("/api/auth/me")
      .then((me) => {
        if (cancelled) return;
        setCsrfToken(me.csrfToken);
        if (requiredRole && me.user.ruolo !== requiredRole) {
          router.replace(me.user.ruolo === "ADMIN" ? "/admin" : "/area");
          return;
        }
        setUser(me.user);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      });
    return () => {
      cancelled = true;
    };
  }, [requiredRole, router]);

  return { user, loading, setUser };
}
