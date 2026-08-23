"use client";

import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { OPEN_COMMAND_PALETTE_EVENT } from "@/components/shell/command-palette";

const PAGE_LABELS: Record<string, string> = {
  overview: "개요",
  data: "데이터",
  agents: "에이전트",
  chat: "채팅",
};

const ADMIN_LABELS: Record<string, string> = {
  overview: "관리 개요",
  users: "사용자",
  data: "데이터",
  agents: "에이전트",
  llm: "LLM 소스",
  audit: "감사 · alert",
  infra: "인프라 · 리소스",
};

/** TOPBAR 좌측 라벨 — CONSOLE.md §4 "{작업공간 또는 PROJECT/활성}". */
function labelForPath(pathname: string): string {
  if (pathname === "/dashboard") return "작업공간 · 대시보드";
  if (pathname === "/data") return "작업공간 · 데이터함";

  const projectMatch = pathname.match(/^\/p\/([^/]+)\/([^/]+)/);
  if (projectMatch) {
    const seg = PAGE_LABELS[projectMatch[2]] ?? projectMatch[2];
    return `프로젝트 · ${seg}`;
  }

  const adminMatch = pathname.match(/^\/admin\/([^/]+)/);
  if (adminMatch) {
    const seg = ADMIN_LABELS[adminMatch[1]] ?? adminMatch[1];
    return `관리자 콘솔 · ${seg}`;
  }

  return "D.A.P";
}

/** CONSOLE.md §4 TOPBAR: 컨텍스트 라벨 + ⌘K 트리거. */
export function Topbar() {
  const pathname = usePathname();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-3">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <span className="font-mono text-xs text-muted-foreground">{labelForPath(pathname)}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="font-mono text-xs"
        onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT))}
      >
        ⌘K
      </Button>
    </header>
  );
}
