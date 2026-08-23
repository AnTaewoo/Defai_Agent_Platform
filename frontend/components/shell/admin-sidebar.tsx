"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Bot,
  Database,
  Gauge,
  LogOut,
  ScrollText,
  Server,
  Users,
} from "lucide-react";

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

const ADMIN_NAV = [
  { href: "/admin/overview", label: "관리 개요", icon: Gauge },
  { href: "/admin/users", label: "사용자", icon: Users },
  { href: "/admin/data", label: "데이터", icon: Database },
  { href: "/admin/agents", label: "에이전트", icon: Bot },
  { href: "/admin/llm", label: "LLM 소스", icon: ArrowLeftRight },
  { href: "/admin/audit", label: "감사 · alert", icon: ScrollText },
  { href: "/admin/infra", label: "인프라 · 리소스", icon: Server },
];

/**
 * OPS_CONSOLE.md §2 — 전 라우트 클리어런스 L5 전용.
 * "관리자 셸은 프로젝트 스위처 대신 환경 배지(ON-PREM · 현재 LLM 소스 · 전역 상태)를 띄운다."
 */
export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useSession();

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
          <span className="font-mono text-[10px] text-muted-foreground">Ops Console</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>시스템 전역</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton render={<Link href={href} />} isActive={pathname === href} tooltip={label}>
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/dashboard" />} tooltip="사용자 콘솔로">
              <ArrowLeftRight />
              <span>사용자 콘솔로</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <LlmSourceStatus />
        <SidebarSeparator />
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <div className="flex flex-col gap-0.5 overflow-hidden">
            <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
            <span className="font-mono text-[10px] uppercase text-muted-foreground">admin</span>
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
