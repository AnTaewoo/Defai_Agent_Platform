"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SecurityBadge } from "@/components/security/security-badge";
import { CreateProjectDialog } from "@/components/projects/create-project";
import { ProjectGrid } from "@/components/projects/project-grid";
import { listLibraryData, listProjects } from "@/lib/api/client";
import type { DataItemOut, ProjectSummary } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";
import { ArrowUpRight, Database } from "lucide-react";

const INDEX_STATUS_LABEL: Record<string, string> = {
  indexed: "색인 완료",
  indexing: "색인 중",
  failed: "색인 실패",
};

/** CONSOLE.md §5.1 — 대시보드: 내 프로젝트 카드 그리드 + 생성 + 라이브러리 미리보기. */
export default function DashboardPage() {
  const { ctx, user } = useSession();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [data, setData] = useState<DataItemOut[]>([]);

  useEffect(() => {
    listProjects(ctx).then(setProjects).catch(console.error);
    listLibraryData(ctx).then(setData).catch(console.error);
  }, [ctx.principal.user_id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-xl font-semibold tracking-wide text-foreground">
            대시보드
          </h1>
          <p className="text-sm text-muted-foreground">
            {user.name}님 ·{" "}
            <span className="font-mono">L{user.level}</span> 클리어런스
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-sm font-medium text-foreground">내 프로젝트</h2>
        <ProjectGrid projects={projects} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-sm font-medium text-foreground">내 데이터함</h2>
          <Button variant="outline" size="sm" render={<Link href="/data" />}>
            데이터함 열기
            <ArrowUpRight />
          </Button>
        </div>
        <Card className="[--card-spacing:--spacing(8)]">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-sm">최근 업로드</CardTitle>
            <CardDescription>
              top-level 라이브러리 — 프로젝트와 무관하게 내 소유로 쌓인 데이터입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-10 text-center">
                <Database className="size-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">아직 업로드한 데이터가 없습니다.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>데이터</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>부서</TableHead>
                    <TableHead>등급</TableHead>
                    <TableHead>색인 상태</TableHead>
                    <TableHead className="text-right">연결 프로젝트</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.slice(0, 5).map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="truncate">{d.filename || d.id}</span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {d.chunk_count ?? 0} 청크
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs uppercase text-muted-foreground">
                        {d.doc_type}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.dept ?? "-"}</TableCell>
                      <TableCell>
                        <SecurityBadge level={d.security_level} visibility={d.visibility} />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {INDEX_STATUS_LABEL[d.index_status] ?? d.index_status}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {d.attached_project_count ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
