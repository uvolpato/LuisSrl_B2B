"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, setCsrfToken } from "../lib/api";
import type { MeResponse } from "../lib/types";
import LoadingScreen from "../components/common/LoadingScreen";

/** Smista alla home giusta in base alla sessione. */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    api
      .get<MeResponse>("/api/auth/me")
      .then((me) => {
        setCsrfToken(me.csrfToken);
        router.replace(me.user.ruolo === "ADMIN" ? "/admin" : "/area");
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return <LoadingScreen />;
}
