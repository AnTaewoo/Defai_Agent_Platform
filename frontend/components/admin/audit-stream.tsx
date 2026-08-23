"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SecurityBadge } from "@/components/security/security-badge";
import type { AuditEntry, UserPublicOut } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Pause, Play } from "lucide-react";

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
  cloud_l3_proceed: "cloud L3 진행 확인",
};

const SEVERITY_ROW: Record<AuditEntry["severity"], string> = {
  info: "",
  warn: "bg-security-3/10",
  crit: "bg-security-5/10",
};

const SEVERITY_DOT: Record<AuditEntry["severity"], string> = {
  info: "bg-muted-foreground",
  warn: "bg-security-3",
  crit: "bg-security-5",
};

/** 합성 라이브 이벤트 생성용 후보 — 일시정지가 아닐 때 주기적으로 스트림에 추가. */
const LIVE_CANDIDATES: Omit<AuditEntry, "id" | "at">[] = [
  { user_id: "u-l2", action: "search", detail: "proj-default 내 검색 수행", severity: "info" },
  { user_id: "u-l3", action: "agent_call", detail: "기본 에이전트 호출", severity: "info" },
  { user_id: "u-l1", action: "access_denied", detail: "data-3(L5/private) 열람 시도 거부", severity: "crit" },
  { user_id: "u-l4", action: "login", detail: "이상 로그인 패턴 감지 · 신규 IP", severity: "crit" },
];

interface AuditStreamProps {
  initialEntries: AuditEntry[];
  users?: UserPublicOut[];
  className?: string;
}

/**
 * OPS_CONSOLE.md §3.6 — 실시간 스트림 + 일시정지 토글 + 강조 규칙.
 * 빨강(crit) = 클리어런스 초과·권한 거부·이상 로그인. 앰버(warn) = cloud 전환·클리어런스 변경(L5 승격 등).
 */
export function AuditStream({ initialEntries, users = [], className }: AuditStreamProps) {
  const [entries, setEntries] = useState<AuditEntry[]>(initialEntries);
  const [paused, setPaused] = useState(false);
  const idxRef = useRef(0);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      const next = LIVE_CANDIDATES[idxRef.current % LIVE_CANDIDATES.length];
      idxRef.current += 1;
      setEntries((prev) => [
        { ...next, id: `a-live-${Date.now()}`, at: new Date().toISOString() },
        ...prev,
      ]);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <Card className={cn("p-0", className)}>
      <CardHeader className="flex-row items-center justify-between border-b border-border [.border-b]:pb-4">
        <div className="space-y-1">
          <CardTitle className="text-sm">감사 스트림</CardTitle>
          <CardDescription>
            로그인/로그아웃 · 검색 · 에이전트 호출 · 업로드 · 등급 변경 · 권한 판정 · LLM 소스 전환
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => setPaused((p) => !p)}>
          {paused ? <Play /> : <Pause />}
          {paused ? "재개" : "일시정지"}
        </Button>
      </CardHeader>
      <CardContent className="max-h-[32rem] overflow-y-auto p-0">
        <ul className="divide-y divide-border">
          {entries.map((entry) => {
            const user = users.find((u) => u.id === entry.user_id);
            return (
              <li
                key={entry.id}
                className={cn("flex items-start gap-3 px-4 py-2.5 text-sm", SEVERITY_ROW[entry.severity])}
              >
                <span
                  className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", SEVERITY_DOT[entry.severity])}
                  aria-hidden
                />
                <span className="w-32 shrink-0 font-mono text-[11px] text-muted-foreground">
                  {new Date(entry.at).toLocaleString("ko-KR")}
                </span>
                <span className="w-24 shrink-0 truncate font-medium text-foreground">
                  {user?.name ?? entry.user_id}
                </span>
                <span className="w-28 shrink-0 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  {ACTION_LABEL[entry.action] ?? entry.action}
                </span>
                <span className="flex-1 text-foreground">{entry.detail}</span>
                {user && <SecurityBadge level={user.level} visibility="shared" className="shrink-0" />}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
