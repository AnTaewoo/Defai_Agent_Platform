"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SecurityBadge } from "@/components/security/security-badge";
import { GlobalKpi } from "@/components/admin/global-kpi";
import { LlmSourcePanel } from "@/components/admin/llm-source-panel";
import { ServiceTiles } from "@/components/admin/service-tiles";
import { getAdminAgents, getAdminAuditLog, getLlmSource, listUsers } from "@/lib/api/client";
import type { AdminAgentOut, AuditEntry, LlmSourceStatus, UserPublicOut } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";
import { cn } from "@/lib/utils";

const ACTION_LABEL: Record<string, string> = {
  login: "로그인",
  logout: "로그아웃",
  search: "검색",
  agent_call: "에이전트 호출",
  upload: "업로드",
  level_change: "클리어런스 변경",
  data_level_change: "데이터 등급 변경",
  agent_level_change: "에이전트 등급 변경",
  access_denied: "권한 거부",
  llm_source_change: "LLM 소스 전환",
  chat: "채팅",
};

const SEVERITY_DOT: Record<"info" | "warn" | "crit", string> = {
  info: "bg-muted-foreground",
  warn: "bg-security-3",
  crit: "bg-security-5",
};

/**
 * OPS_CONSOLE.md §3.1 — 관리 개요.
 * 전역 KPI + LLM 소스 상태 히어로(시그니처) + 최근 alert 패널 + 서비스 상태 스트립.
 */
export default function AdminOverviewPage() {
  const { ctx } = useSession();
  const [users, setUsers] = useState<UserPublicOut[]>([]);
  const [llmSource, setLlmSource] = useState<LlmSourceStatus | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [agents, setAgents] = useState<AdminAgentOut[]>([]);

  useEffect(() => {
    listUsers().then(setUsers).catch(console.error);
    getLlmSource(ctx).then(setLlmSource).catch(console.error);
    getAdminAuditLog(ctx).then(setAuditLog).catch(console.error);
    getAdminAgents(ctx).then(setAgents).catch(console.error);
  }, [ctx.principal.user_id]);

  const recentAlerts = auditLog.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold tracking-wide text-foreground">
          관리 개요
        </h1>
        <p className="text-sm text-muted-foreground">
          시스템 전역 현황입니다. L5 클리어런스(admin)만 접근합니다.
        </p>
      </div>

      <GlobalKpi
        items={[
          { label: "전체 user", value: users.length },
          { label: "전체 프로젝트", value: "-" },
          { label: "전체 에이전트", value: agents.length },
          { label: "감사 로그", value: auditLog.length, hint: "최근 200건" },
        ]}
      />

      {llmSource && <LlmSourcePanel source={llmSource} />}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="p-0">
          <CardHeader className="border-b border-border [.border-b]:pb-4">
            <CardTitle className="text-sm">최근 alert</CardTitle>
            <CardDescription>
              클리어런스 초과 요청 · 신규 로그인 · 등급/클리어런스 변경 · cloud 전환 등
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            {recentAlerts.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">감사 로그가 없습니다.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentAlerts.map((a) => {
                  const user = users.find((u) => u.id === a.user_id);
                  const sev = (a.severity as "info" | "warn" | "crit") in SEVERITY_DOT
                    ? (a.severity as "info" | "warn" | "crit")
                    : "info";
                  return (
                    <li key={a.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                      <span
                        className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", SEVERITY_DOT[sev])}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground">
                            {user?.name ?? a.user_id} · {ACTION_LABEL[a.action] ?? a.action}
                          </span>
                          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                            {new Date(a.at).toLocaleString("ko-KR")}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{a.detail}</p>
                      </div>
                      {user && (
                        <SecurityBadge level={user.level} visibility="shared" className="shrink-0" />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardHeader className="border-b border-border [.border-b]:pb-4">
            <CardTitle className="text-sm">서비스 상태</CardTitle>
            <CardDescription>상세는 인프라 · 리소스 탭에서 확인하세요.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ServiceTiles compact />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
