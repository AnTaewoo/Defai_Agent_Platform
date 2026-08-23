import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LlmSourceStatus } from "@/lib/api/types";
import { ArrowUpRight, ShieldAlert, ShieldCheck } from "lucide-react";

interface LlmSourcePanelProps {
  source: LlmSourceStatus;
  className?: string;
}

/**
 * OPS_CONSOLE.md §3.1 — LLM 소스 상태 패널(시그니처). 잉크 면 히어로.
 * on-prem: EGRESS 0 · 외부 LLM 호출 0 불변식 LED 정상(무채색 + security-1 점).
 * cloud: 빨간 경고 면(security-5) + "외부 전송 위험" 카피.
 */
export function LlmSourcePanel({ source, className }: LlmSourcePanelProps) {
  const isCloud = source.mode === "cloud";

  return (
    <Card
      className={cn(
        "gap-4 border-0 ring-1",
        isCloud
          ? "bg-security-5/10 ring-security-5/40"
          : "bg-foreground text-background ring-foreground/10",
        className,
      )}
    >
      <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest opacity-70">
            {isCloud ? <ShieldAlert className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
            LLM 소스 · 전역
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "size-2.5 rounded-full",
                isCloud ? "bg-security-5 animate-pulse" : "bg-security-1",
              )}
              aria-hidden
            />
            <h2 className="font-heading text-2xl font-semibold tracking-wide md:text-3xl">
              {isCloud ? "CLOUD (외부)" : "ON-PREM (AIR-GAP)"}
            </h2>
          </div>
          <p
            className={cn(
              "text-sm",
              isCloud ? "text-security-5" : "opacity-70",
            )}
          >
            {isCloud
              ? "외부 전송 위험 — EGRESS 0 / 외부 LLM 호출 0 불변식이 깨진 상태입니다. L3 이상 데이터 라우팅은 고위험."
              : "EGRESS 0 · 외부 LLM 호출 0 불변식 정상. 모든 추론은 사내 vLLM에서 수행됩니다."}
          </p>
          <p className="font-mono text-xs opacity-60">{source.provider}</p>
        </div>

        <Button
          size="sm"
          variant={isCloud ? "destructive" : "outline"}
          className={cn(!isCloud && "border-background/30 bg-transparent text-background hover:bg-background/10")}
          render={<Link href="/admin/llm" />}
        >
          LLM 소스 관리
          <ArrowUpRight />
        </Button>
      </CardContent>
    </Card>
  );
}
