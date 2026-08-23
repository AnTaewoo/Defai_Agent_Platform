"use client";

import { useEffect, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { SecurityBadge } from "@/components/security/security-badge";
import { getDataChunks } from "@/lib/api/client";
import type { ChunkOut, DataItemOut } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";
import { FileText } from "lucide-react";

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

/** CONSOLE.md §5.2 — Data Sheet: 메타·등급·연결된 프로젝트 목록 + 청크 카드 스크롤 목록. */
export function DataSheet({ item, open, onOpenChange }: DataSheetProps) {
  const { ctx } = useSession();
  const [chunks, setChunks] = useState<ChunkOut[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !item) {
      setChunks([]);
      return;
    }
    setLoading(true);
    getDataChunks(ctx, item.id)
      .then(setChunks)
      .catch(() => setChunks([]))
      .finally(() => setLoading(false));
  }, [open, item?.id]);

  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[520px] flex-col gap-0 overflow-hidden sm:max-w-[520px]">
        <SheetHeader className="px-6 pb-4 pt-6">
          <SheetTitle className="truncate">{item.filename || item.id}</SheetTitle>
          <SheetDescription>데이터 메타데이터 · 색인 상태 · 청크 목록</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-6">
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
            <dd className="font-mono text-foreground">{loading ? "…" : chunks.length}</dd>
            <dt className="text-muted-foreground">연결 프로젝트 수</dt>
            <dd className="font-mono text-foreground">{item.attached_project_count ?? 0}</dd>
          </dl>

          <Separator />

          <h3 className="font-heading text-sm font-medium text-foreground">
            청크 목록
            {chunks.length > 0 && (
              <span className="ml-2 font-mono text-[11px] font-normal text-muted-foreground">
                {chunks.length}개
              </span>
            )}
          </h3>
        </div>

        {/* 스크롤 가능한 청크 카드 영역 */}
        <div className="mt-3 flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <p className="py-8 text-center text-xs text-muted-foreground">청크 불러오는 중…</p>
          ) : chunks.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              색인된 청크가 없습니다.
            </p>
          ) : (
            <ol className="space-y-2">
              {chunks.map((chunk, idx) => (
                <li
                  key={idx}
                  className="rounded-lg border border-border bg-card px-3 py-2.5 space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-[10px] text-muted-foreground">
                      {idx + 1}
                    </span>
                    <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                    <p className="truncate text-xs font-medium text-foreground">
                      {chunk.summary || `Chunk ${idx + 1}`}
                    </p>
                  </div>
                  <p className="line-clamp-3 pl-7 text-[11px] leading-relaxed text-muted-foreground">
                    {chunk.text}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
