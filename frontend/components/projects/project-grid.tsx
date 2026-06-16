"use client";

import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SecurityBadge } from "@/components/security/security-badge";
import type { ProjectSummary } from "@/lib/api/types";
import { Database, Users } from "lucide-react";

interface ProjectGridProps {
  projects: ProjectSummary[];
}

/** CONSOLE.md §5.1 — 내 프로젝트 카드 그리드: 프로젝트명 · 내 역할(mono) · 멤버 수 · 연결 데이터 수 · 최고 등급. */
export function ProjectGrid({ projects }: ProjectGridProps) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-1.5 py-10 text-center">
          <p className="text-sm font-medium text-foreground">참여 중인 프로젝트가 없습니다</p>
          <p className="text-sm text-muted-foreground">
            프로젝트를 생성하거나, 동료·관리자가 추가할 때까지 대기하세요.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <Link key={p.id} href={`/p/${p.id}/overview`}>
          <Card className="h-full transition-colors hover:bg-muted/40 [--card-spacing:--spacing(8)]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span className="truncate">{p.name}</span>
                <SecurityBadge level={p.max_security_level} visibility="shared" />
              </CardTitle>
              <CardDescription className="line-clamp-2">{p.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3 text-xs">
              <span className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono uppercase text-muted-foreground">
                {p.my_role}
              </span>
              <div className="flex items-center gap-3 font-mono text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" />
                  {p.member_count}
                </span>
                <span className="flex items-center gap-1">
                  <Database className="size-3.5" />
                  {p.attached_data_count}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
