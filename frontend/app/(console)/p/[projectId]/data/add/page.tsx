"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AddDataList } from "@/components/data/add-data-sheet";
import { attachProjectData, listLibraryData, listProjectData } from "@/lib/api/client";
import type { DataItemOut } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";
import { ArrowLeft } from "lucide-react";

/** CONSOLE.md §6 — 데이터 추가는 member 이상(viewer ✗). */
const ROLE_CAN_ADD = new Set(["member", "editor", "manager", "project_admin"]);

/**
 * CONSOLE.md §5.4 — 데이터 추가: 라이브러리에서 프로젝트에 데이터 연결.
 * GET /data(라이브러리) → 후보 표시, 연결 버튼 → POST /projects/{id}/data.
 */
export default function ProjectAddDataPage({
  params,
}: {
  params: { projectId: string };
}) {
  const { ctx } = useSession();
  const router = useRouter();
  const canAdd = ROLE_CAN_ADD.has(ctx.membership.role);

  const [candidates, setCandidates] = useState<DataItemOut[]>([]);
  const [attachedIds, setAttachedIds] = useState<Set<string>>(new Set());
  const [projectDataCount, setProjectDataCount] = useState(0);

  const reload = useCallback(async () => {
    const [lib, proj] = await Promise.all([
      listLibraryData(ctx),
      listProjectData(ctx, params.projectId),
    ]);
    setCandidates(lib);
    setAttachedIds(new Set(proj.map((d) => d.id)));
    setProjectDataCount(proj.length);
  }, [ctx, params.projectId]);

  useEffect(() => {
    if (!canAdd) { router.replace(`/p/${params.projectId}/data`); return; }
    void reload();
  }, [canAdd, params.projectId, router, reload]);

  async function handleAttach(item: DataItemOut) {
    setAttachedIds((prev) => new Set(prev).add(item.id));
    await attachProjectData(ctx, params.projectId, [item.id]);
    await reload();
  }

  if (!canAdd) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          render={<Link href={`/p/${params.projectId}/data`} />}
        >
          <ArrowLeft />
          프로젝트 데이터로
        </Button>
        <h1 className="font-heading text-xl font-semibold tracking-wide text-foreground">
          데이터 추가
        </h1>
        <p className="text-sm text-muted-foreground">
          내 라이브러리 + 접근 가능한 공용 데이터 중에서 이 프로젝트에 연결할 항목을 선택하세요.
          새 파일 업로드는{" "}
          <Link href="/data" className="underline">
            데이터함
          </Link>
          에서 먼저 진행합니다.
        </p>
      </div>

      <AddDataList
        candidates={candidates}
        attachedIds={attachedIds}
        onAttach={(item) => void handleAttach(item)}
      />

      <p className="font-mono text-[11px] text-muted-foreground">
        현재 프로젝트에 연결된 데이터: {projectDataCount}건
      </p>
    </div>
  );
}
