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
import { listProjectData } from "@/lib/api/client";
import type { DataItemOut } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";
import { Plus } from "lucide-react";

const INDEX_STATUS_LABEL: Record<string, string> = {
  indexed: "색인 완료",
  indexing: "색인 중",
  failed: "색인 실패",
};

/** CONSOLE.md §6 — 데이터 추가는 member 이상(viewer ✗). */
const ROLE_CAN_ADD = new Set(["member", "editor", "manager", "project_admin"]);

/** CONSOLE.md §5.4 — 프로젝트 데이터: 연결된 데이터 테이블(목록만) + 데이터 추가 진입. */
export default function ProjectDataPage({
  params,
}: {
  params: { projectId: string };
}) {
  const { ctx } = useSession();
  const [data, setData] = useState<DataItemOut[]>([]);
  const canAdd = ROLE_CAN_ADD.has(ctx.membership.role);

  useEffect(() => {
    listProjectData(ctx, params.projectId)
      .then(setData)
      .catch(console.error);
  }, [ctx.principal.user_id, params.projectId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-xl font-semibold tracking-wide text-foreground">
            프로젝트 데이터
          </h1>
          <p className="text-sm text-muted-foreground">
            이 프로젝트에 연결(attach)된 데이터입니다. 새 파일 업로드는 데이터함에서 먼저
            진행하세요.
          </p>
        </div>
        {canAdd && (
          <Button size="sm" render={<Link href={`/p/${params.projectId}/data/add`} />}>
            <Plus />
            데이터 추가
          </Button>
        )}
      </div>

      <Card className="p-0">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-sm">연결된 데이터</CardTitle>
          <CardDescription>활성 프로젝트 + 내 클리어런스 이하로 필터된 결과</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              연결된 데이터가 없습니다.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>데이터</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>등급</TableHead>
                  <TableHead>색인 상태</TableHead>
                  <TableHead className="text-right">연결 시각</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="truncate font-mono text-xs">{d.id}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {d.chunk_count ?? 0} 청크 · {d.doc_type.toUpperCase()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.dept ?? "-"}</TableCell>
                    <TableCell>
                      <SecurityBadge level={d.security_level} visibility={d.visibility} />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {INDEX_STATUS_LABEL[d.index_status] ?? d.index_status}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      -
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
