"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SecurityBadge } from "@/components/security/security-badge";
import { InviteMemberDialog } from "@/components/projects/invite-member";
import { getProject, listProjectAgents, listProjectData, listProjectMembers } from "@/lib/api/client";
import type { AgentOut, DataItemOut, MemberOut, ProjectSummary } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";
import { Bot, Database, ShieldAlert, Users } from "lucide-react";

const INDEX_STATUS_LABEL: Record<string, string> = {
  indexed: "색인 완료",
  indexing: "색인 중",
  failed: "색인 실패",
};

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

const ROLE_LABEL: Record<string, string> = {
  project_admin: "관리자",
  manager: "매니저",
  editor: "에디터",
  member: "멤버",
  viewer: "뷰어",
};

/** CONSOLE.md §5.3 — 프로젝트 개요: KPI 4종 + 최근 데이터 패널 + 멤버 패널. */
export default function ProjectOverviewPage() {
  const { ctx } = useSession();
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [data, setData] = useState<DataItemOut[]>([]);
  const [members, setMembers] = useState<MemberOut[]>([]);
  const [agents, setAgents] = useState<AgentOut[]>([]);

  function refreshMembers() {
    if (projectId) listProjectMembers(ctx, projectId).then(setMembers).catch(console.error);
  }

  useEffect(() => {
    if (!projectId) return;
    getProject(ctx, projectId).then(setProject).catch(console.error);
    listProjectData(ctx, projectId).then(setData).catch(console.error);
    listProjectMembers(ctx, projectId).then(setMembers).catch(console.error);
    listProjectAgents(ctx, projectId).then(setAgents).catch(console.error);
  }, [projectId, ctx.principal.user_id]);

  const indexingCount = data.filter((d) => d.index_status === "indexing").length;
  const sharedCount = data.filter((d) => d.visibility === "shared").length;
  const privateCount = data.filter((d) => d.visibility === "private").length;

  const myRole = project?.my_role ?? ctx.membership.role;
  const canInvite = myRole === "manager" || myRole === "project_admin";

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold tracking-wide text-foreground">
          {project?.name ?? "…"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {project?.description || "설명 없음"}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="[--card-spacing:--spacing(8)]">
          <CardHeader className="flex-row items-center justify-between gap-2 pb-1">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
              연결 데이터
            </CardTitle>
            <Database className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-semibold text-foreground">{data.length}</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              공용 {sharedCount} · 개인 {privateCount}
            </p>
          </CardContent>
        </Card>

        <Card className="[--card-spacing:--spacing(8)]">
          <CardHeader className="flex-row items-center justify-between gap-2 pb-1">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
              가용 에이전트
            </CardTitle>
            <Bot className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-semibold text-foreground">{agents.length}</p>
            <p className="font-mono text-[11px] text-muted-foreground">클리어런스 이하 가용</p>
          </CardContent>
        </Card>

        <Card className="[--card-spacing:--spacing(8)]">
          <CardHeader className="flex-row items-center justify-between gap-2 pb-1">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
              색인 진행
            </CardTitle>
            <ShieldAlert className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-semibold text-foreground">{indexingCount}</p>
            <p className="font-mono text-[11px] text-muted-foreground">큐 대기 중</p>
          </CardContent>
        </Card>

        <Card className="[--card-spacing:--spacing(8)]">
          <CardHeader className="flex-row items-center justify-between gap-2 pb-1">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
              프로젝트 멤버
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-semibold text-foreground">{members.length}</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              내 역할: {ROLE_LABEL[myRole] ?? myRole}
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        모든 수치는 활성 프로젝트 + 내 클리어런스(L{ctx.principal.level}) 이하로 필터된
        값입니다. 등급 위 자료·에이전트는 서버 차단으로 이 목록에 나타나지 않습니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="[--card-spacing:--spacing(8)]">
          <CardHeader>
            <CardTitle className="text-sm">연결 데이터</CardTitle>
            <CardDescription>프로젝트에 연결된 데이터 중 클리어런스 이하</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                연결된 데이터가 없습니다.
              </p>
            ) : (
              data.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-2"
                >
                  <span className="truncate text-sm text-foreground">
                    {d.filename || d.id}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {INDEX_STATUS_LABEL[d.index_status] ?? d.index_status}
                    </span>
                    <SecurityBadge level={d.security_level} visibility={d.visibility} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="[--card-spacing:--spacing(8)]">
          <CardHeader className="flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm">프로젝트 멤버</CardTitle>
              <CardDescription>역할 · 클리어런스</CardDescription>
            </div>
            {canInvite && (
              <InviteMemberDialog
                projectId={projectId}
                existingUserIds={members.map((m) => m.user_id)}
                onInvite={refreshMembers}
              />
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {members.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                멤버 정보를 불러오는 중입니다.
              </p>
            ) : (
              members.map((m) => (
                <div
                  key={m.user_id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-foreground">{m.user_id}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {ROLE_LABEL[m.role] ?? m.role}
                    </span>
                  </div>
                  <SecurityBadge level={m.level} visibility="shared" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {agents.length > 0 && (
        <Card className="[--card-spacing:--spacing(8)]">
          <CardHeader>
            <CardTitle className="text-sm">에이전트 상태</CardTitle>
            <CardDescription>가용 에이전트의 등급·상태</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {agents.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className={`size-1.5 rounded-full ${STATUS_LED[a.status]}`} aria-hidden />
                  <span className="text-sm text-foreground">{a.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {STATUS_LABEL[a.status]}
                  </span>
                  <SecurityBadge level={a.security_level} visibility={a.visibility} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
