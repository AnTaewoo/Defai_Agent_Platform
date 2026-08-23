"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SecurityBadge } from "@/components/security/security-badge";
import type { AgentOut } from "@/lib/api/types";

const STATUS_LABEL: Record<string, string> = {
  idle: "유휴",
  searching: "검색 중",
  busy: "대기",
};

const STATUS_LED: Record<string, string> = {
  idle: "bg-security-1",
  searching: "bg-security-3",
  busy: "bg-muted-foreground",
};

interface AgentGridProps {
  agents: AgentOut[];
}

/** CONSOLE.md §5.5 — 에이전트 카드 그리드: 이름 · 설명 · 등급 배지 · 소유자 · LED 상태. */
export function AgentGrid({ agents }: AgentGridProps) {
  if (agents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-1 py-10 text-center">
          <p className="text-sm text-muted-foreground">가용한 에이전트가 없습니다.</p>
          <p className="text-xs text-muted-foreground">
            클리어런스 미달 등급 에이전트는 목록에서 자동 제외됩니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map((a) => (
        <Card key={a.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="truncate">{a.name}</span>
              <SecurityBadge level={a.security_level} visibility={a.visibility} />
            </CardTitle>
            <CardDescription className="line-clamp-2">{a.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-2 text-xs">
            <span className="font-mono text-muted-foreground">owner · {a.owner_id}</span>
            <span className="flex items-center gap-1.5 font-mono text-muted-foreground">
              <span className={`size-1.5 rounded-full ${STATUS_LED[a.status]}`} aria-hidden />
              {STATUS_LABEL[a.status]}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
