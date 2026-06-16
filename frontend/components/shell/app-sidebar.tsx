"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, Database, FolderKanban, LayoutDashboard, LogOut, MessageSquare, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { SecurityBadge } from "@/components/security/security-badge";
import { LlmSourceStatus } from "@/components/shell/llm-source-status";
import { useSession } from "@/lib/session-context";

/** `/p/[projectId]/...` 경로에서 프로젝트 id를 추출. 그 외 경로에서는 프로젝트 영역을 접는다. */
function activeProjectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/p\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * CONSOLE.md §4 앱 셸 사이드바 — 2영역(작업공간 항상 / 프로젝트는 `/p/[id]` 진입 시)
 * + LLM 소스 표시(읽기전용) + 유저·클리어런스(+역할) 카드.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { ctx, user, isAdmin, signOut } = useSession();
  const projectId = activeProjectIdFromPath(pathname);

  function handleSignOut() {
    signOut();
    router.replace("/login");
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="font-heading text-sm font-semibold tracking-wide text-foreground">
            D.A.P
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">Mission Console</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>작업공간</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/dashboard" />}
                  isActive={pathname === "/dashboard"}
                  tooltip="대시보드"
                >
                  <LayoutDashboard />
                  <span>대시보드</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/data" />}
                  isActive={pathname === "/data"}
                  tooltip="데이터함"
                >
                  <Database />
                  <span>데이터함</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {projectId && (
          <SidebarGroup>
            <SidebarGroupLabel>프로젝트</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href={`/p/${projectId}/overview`} />}
                    isActive={pathname === `/p/${projectId}/overview`}
                    tooltip="개요"
                  >
                    <FolderKanban />
                    <span>개요</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href={`/p/${projectId}/data`} />}
                    isActive={pathname.startsWith(`/p/${projectId}/data`)}
                    tooltip="데이터"
                  >
                    <Database />
                    <span>데이터</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href={`/p/${projectId}/agents`} />}
                    isActive={pathname === `/p/${projectId}/agents`}
                    tooltip="에이전트"
                  >
                    <Bot />
                    <span>에이전트</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href={`/p/${projectId}/chat/${ctx.session_id}`} />}
                    isActive={pathname.startsWith(`/p/${projectId}/chat`)}
                    tooltip="채팅"
                  >
                    <MessageSquare />
                    <span>채팅</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        {isAdmin && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link href="/admin/overview" />} tooltip="관리자 콘솔">
                <ShieldCheck />
                <span>관리자 콘솔</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <LlmSourceStatus />
        <SidebarSeparator />
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <div className="flex flex-col gap-0.5 overflow-hidden">
            <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
            {projectId && (
              <span className="font-mono text-[10px] uppercase text-muted-foreground">
                {ctx.membership.role}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <SecurityBadge level={user.level} visibility="shared" />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="로그아웃"
              title="로그아웃"
              onClick={handleSignOut}
            >
              <LogOut />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
