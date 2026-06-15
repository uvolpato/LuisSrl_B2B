"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setCsrfToken } from "./api";
import type { MeResponse, UserProfile, CustomerProfile } from "./types";

export function useAuth(requiredType?: "admin" | "customer") {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get<MeResponse>("/api/auth/me")
      .then((me) => {
        if (cancelled) return;
        setCsrfToken(me.csrfToken);
        if (requiredType && me.user.userType !== requiredType) {
          router.replace(me.user.userType === "admin" ? "/admin" : "/area");
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
  }, [requiredType, router]);

  return { user, loading, setUser };
}
