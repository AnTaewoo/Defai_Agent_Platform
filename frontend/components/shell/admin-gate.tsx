"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/session-context";

/**
 * OPS_CONSOLE.md §2 — "(admin) [auth + level == L5]". L1~L4는 진입 0.
 * 실제로는 서버 미들웨어가 강제하지만, 목 인증 단계에서는 클라이언트 게이트로 대체.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isAdmin) router.replace("/dashboard");
  }, [isAdmin, router]);

  if (!isAdmin) return null;
  return <>{children}</>;
}
