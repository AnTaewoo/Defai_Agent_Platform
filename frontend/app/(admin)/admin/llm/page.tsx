"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getLlmSource } from "@/lib/api/client";
import type { AuditEntry, LlmSourceStatus } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";
import { cn } from "@/lib/utils";
import { ShieldAlert, ShieldCheck } from "lucide-react";

const CLOUD_WARNING =
  "외부 LLM(예: OpenAI) 사용 시 질의·문서가 망 외부로 전송됨. EGRESS 0 / 외부 LLM 호출 0 불변식이 깨짐. L3 이상 데이터 라우팅은 고위험.";

/**
 * OPS_CONSOLE.md §3.5 — LLM 소스 전역 토글(on-prem ↔ cloud).
 * MOCK_LLM_SOURCE는 초기값으로만 사용 — 토글은 로컬 state에서만 일어난다.
 * cloud 전환 시 경고 dialog(문구 그대로) → 확인해야 전환.
 */
export default function AdminLlmPage() {
  const { ctx } = useSession();
  const [source, setSource] = useState<LlmSourceStatus | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recentChanges, setRecentChanges] = useState<AuditEntry[]>([]);

  useEffect(() => {
    getLlmSource(ctx).then(setSource).catch(console.error);
  }, [ctx.principal.user_id]);

  const isCloud = source?.mode === "cloud";

  function applyChange(nextMode: "on-prem" | "cloud") {
    const now = new Date().toISOString();
    const provider =
      nextMode === "on-prem"
        ? (source?.mode === "on-prem" ? source.provider : "vLLM (on-prem)")
        : "CLOUD API (외부 제공자)";

    setSource({
      mode: nextMode,
      provider,
      changed_at: now,
      changed_by: ctx.principal.user_id,
    });

    const entry: AuditEntry = {
      id: `a-llm-${Date.now()}`,
      at: now,
      user_id: ctx.principal.user_id,
      action: "llm_source_change",
      detail: `LLM 소스 ${source?.mode ?? "?"} → ${nextMode} 전환`,
      severity: "warn",
    };
    setRecentChanges((prev) => [entry, ...prev]);
  }

  function handleToggle() {
    if (isCloud) {
      // cloud → on-prem 전환은 즉시(복귀는 위험 감소 방향).
      applyChange("on-prem");
      return;
    }
    // on-prem → cloud 전환은 경고 확인 필요.
    setConfirmOpen(true);
  }

  function confirmCloud() {
    applyChange("cloud");
    setConfirmOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold tracking-wide text-foreground">LLM 소스</h1>
        <p className="text-sm text-muted-foreground">
          전 에이전트 LLM 파이프라인의 전역 소스를 관리합니다. 토글하면 즉시 전환되며(에이전트별
          설정 없음), 변경은 감사 로그에 기록됩니다.
        </p>
      </div>

      {source === null ? (
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      ) : null}
      <Card
        className={cn(
          "gap-4 border-0 ring-1",
          isCloud
            ? "bg-security-5/10 ring-security-5/40"
            : "bg-foreground text-background ring-foreground/10",
        )}
      >
        <CardContent className="flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest opacity-70">
                {isCloud ? <ShieldAlert className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
                현재 소스
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
                  {isCloud ? "CLOUD API (외부)" : "ON-PREM (vLLM)"}
                </h2>
              </div>
              <p className={cn("text-sm", isCloud ? "text-security-5" : "opacity-70")}>
                {isCloud
                  ? "EXTERNAL · CLOUD — 사용자 콘솔 챗에서 L3 이상 사용 시 경고가 전파됩니다(차단 아님, admin 책임)."
                  : "EGRESS 0 · 외부 LLM 호출 0 불변식 정상."}
              </p>
            </div>

            <Button
              size="lg"
              variant={isCloud ? "outline" : "destructive"}
              className={cn(
                isCloud && "border-background/40 bg-transparent text-security-5 hover:bg-security-5/10",
              )}
              onClick={handleToggle}
            >
              {isCloud ? "ON-PREM(vLLM)으로 전환" : "CLOUD API로 전환"}
            </Button>
          </div>

          <Separator className={cn(isCloud ? "bg-security-5/20" : "bg-background/20")} />

          <dl className="grid grid-cols-1 gap-4 font-mono text-xs sm:grid-cols-3">
            <div className="space-y-1">
              <dt className={cn("uppercase tracking-widest", isCloud ? "text-security-5/80" : "opacity-60")}>
                Provider
              </dt>
              <dd className={cn(isCloud ? "" : "opacity-90")}>{source?.provider ?? "-"}</dd>
            </div>
            <div className="space-y-1">
              <dt className={cn("uppercase tracking-widest", isCloud ? "text-security-5/80" : "opacity-60")}>
                마지막 전환 시각
              </dt>
              <dd className={cn(isCloud ? "" : "opacity-90")}>
                {source?.changed_at ? new Date(source.changed_at).toLocaleString("ko-KR") : "-"}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className={cn("uppercase tracking-widest", isCloud ? "text-security-5/80" : "opacity-60")}>
                전환한 admin
              </dt>
              <dd className={cn(isCloud ? "" : "opacity-90")}>{source?.changed_by ?? "-"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {recentChanges.length > 0 && (
        <Card className="p-0">
          <CardHeader className="border-b border-border [.border-b]:pb-4">
            <CardTitle className="text-sm">최근 전환 이력</CardTitle>
            <CardDescription>변경 즉시 감사 로그(audit_log)에 기록됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {recentChanges.slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground">{a.detail}</span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  {new Date(a.at).toLocaleString("ko-KR")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-security-5">
              <ShieldAlert className="size-4" />
              CLOUD API 전환 확인
            </DialogTitle>
            <DialogDescription className="text-foreground">{CLOUD_WARNING}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={confirmCloud}>
              위험을 인지하고 CLOUD로 전환
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
