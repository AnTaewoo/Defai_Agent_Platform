"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DUMMY_PROJECT_ID, MOCK_PROJECT } from "@/lib/api/mock";
import { useSession } from "@/lib/session-context";

export const OPEN_COMMAND_PALETTE_EVENT = "dap:open-command-palette";

/**
 * 글로벌 ⌘K — CONSOLE.md §3-1 "오버레이(라우트 아님)".
 * Topbar의 ⌘K 버튼은 `window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT))`로 연다.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { ctx, isAdmin } = useSession();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onOpenRequest() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenRequest);
    };
  }, []);

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const projectId = DUMMY_PROJECT_ID;

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="명령 팔레트" description="이동할 위치를 검색하세요">
      <CommandInput placeholder="이동할 위치를 입력하세요..." />
      <CommandList>
        <CommandEmpty>결과 없음</CommandEmpty>
        <CommandGroup heading="작업공간">
          <CommandItem onSelect={() => go("/dashboard")}>대시보드</CommandItem>
          <CommandItem onSelect={() => go("/data")}>데이터함</CommandItem>
        </CommandGroup>
        <CommandGroup heading={`프로젝트 — ${MOCK_PROJECT.name}`}>
          <CommandItem onSelect={() => go(`/p/${projectId}/overview`)}>개요</CommandItem>
          <CommandItem onSelect={() => go(`/p/${projectId}/data`)}>데이터</CommandItem>
          <CommandItem onSelect={() => go(`/p/${projectId}/agents`)}>에이전트</CommandItem>
          <CommandItem onSelect={() => go(`/p/${projectId}/chat/${ctx.session_id}`)}>채팅</CommandItem>
        </CommandGroup>
        {isAdmin && (
          <CommandGroup heading="관리자 콘솔">
            <CommandItem onSelect={() => go("/admin/overview")}>관리 개요</CommandItem>
            <CommandItem onSelect={() => go("/admin/users")}>사용자</CommandItem>
            <CommandItem onSelect={() => go("/admin/data")}>데이터</CommandItem>
            <CommandItem onSelect={() => go("/admin/agents")}>에이전트</CommandItem>
            <CommandItem onSelect={() => go("/admin/llm")}>LLM 소스</CommandItem>
            <CommandItem onSelect={() => go("/admin/audit")}>감사 · alert</CommandItem>
            <CommandItem onSelect={() => go("/admin/infra")}>인프라 · 리소스</CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
