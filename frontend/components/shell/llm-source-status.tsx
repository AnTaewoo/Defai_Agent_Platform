"use client";

import { useEffect, useState } from "react";

import { getLlmSource } from "@/lib/api/client";
import type { LlmSourceStatus } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";
import { cn } from "@/lib/utils";

interface LlmSourceStatusProps {
  className?: string;
}

/**
 * 전역 LLM 소스(읽기전용) — CONSOLE.md §4 "사이드바 하단, 유저 카드 위".
 * on-prem이면 무채색, cloud면 보안등급 L5 톤(crit)으로 경고 표시.
 * 제어는 /admin/llm(L5)에서만 — 일반 user는 상태 확인만.
 */
export function LlmSourceStatus({ className }: LlmSourceStatusProps) {
  const { ctx, isAuthenticated } = useSession();
  const [source, setSource] = useState<LlmSourceStatus | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    getLlmSource(ctx).then(setSource).catch(console.error);
  }, [ctx.principal.user_id]);

  const isCloud = source?.mode === "cloud";

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md border px-2 py-1.5 font-mono text-xs",
        isCloud
          ? "border-security-5/40 bg-security-5/10 text-security-5"
          : "border-border bg-muted/40 text-muted-foreground",
        className,
      )}
    >
      <span className="tracking-wide">LLM</span>
      <span className="font-semibold tracking-wide">
        {source === null ? "…" : isCloud ? "CLOUD · 외부" : "ON-PREM"}
      </span>
    </div>
  );
}
