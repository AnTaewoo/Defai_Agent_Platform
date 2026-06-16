"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/session-context";

/** CONSOLE.md §3-1 `/` — 인증 체크 → `/login` 또는 `/dashboard`. */
export default function Home() {
  const { isAuthenticated } = useSession();
  const router = useRouter();

  useEffect(() => {
    router.replace(isAuthenticated ? "/dashboard" : "/login");
  }, [isAuthenticated, router]);

  return null;
}
