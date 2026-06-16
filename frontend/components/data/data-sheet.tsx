"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { SecurityBadge } from "@/components/security/security-badge";
import { MOCK_PROJECT, MOCK_PROJECT_DATA } from "@/lib/api/mock";
import type { DataItemOut } from "@/lib/api/types";

const INDEX_STATUS_LABEL: Record<string, string> = {
  indexed: "색인 완료",
  indexing: "색인 중",
  failed: "색인 실패",
};

interface DataSheetProps {
  item: DataItemOut | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** CONSOLE.md §5.2 — Data Sheet: 메타·등급·연결된 프로젝트 목록. */
export function DataSheet({ item, open, onOpenChange }: DataSheetProps) {
  if (!item) return null;

  const attachedProjects = MOCK_PROJECT_DATA.filter((pd) => pd.data_id === item.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="truncate">{item.filename || item.id}</SheetTitle>
          <SheetDescription>데이터 메타데이터 · 색인 상태 · 연결된 프로젝트</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4">
          <div className="flex flex-wrap items-center gap-2">
            <SecurityBadge level={item.security_level} visibility={item.visibility} />
            <span className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[11px] uppercase text-muted-foreground">
              {item.doc_type}
            </span>
            <span className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              {INDEX_STATUS_LABEL[item.index_status] ?? item.index_status}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">소유자</dt>
            <dd className="font-mono text-foreground">{item.owner_id}</dd>
            <dt className="text-muted-foreground">부서</dt>
            <dd className="text-foreground">{item.dept ?? "-"}</dd>
            <dt className="text-muted-foreground">청크 수</dt>
            <dd className="font-mono text-foreground">{item.chunk_count ?? 0}</dd>
            <dt className="text-muted-foreground">연결 프로젝트 수</dt>
            <dd className="font-mono text-foreground">{item.attached_project_count ?? 0}</dd>
          </dl>

          <Separator />

          <div className="space-y-2">
            <h3 className="font-heading text-sm font-medium text-foreground">연결된 프로젝트</h3>
            {attachedProjects.length === 0 ? (
              <p className="text-xs text-muted-foreground">연결된 프로젝트가 없습니다.</p>
            ) : (
              <ul className="space-y-1">
                {attachedProjects.map((pd) => (
                  <li
                    key={pd.project_id}
                    className="flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-1.5 text-sm"
                  >
                    <span>{pd.project_id === MOCK_PROJECT.id ? MOCK_PROJECT.name : pd.project_id}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {new Date(pd.attached_at).toLocaleDateString("ko-KR")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
