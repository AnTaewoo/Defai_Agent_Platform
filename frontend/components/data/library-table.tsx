"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SecurityBadge } from "@/components/security/security-badge";
import type { DataItemOut } from "@/lib/api/types";
import { FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const INDEX_STATUS_LABEL: Record<string, string> = {
  indexed: "색인 완료",
  indexing: "색인 중",
  failed: "색인 실패",
};

const DOC_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  pdf: FileText,
  xlsx: FileSpreadsheet,
};

function formatTime(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface LibraryTableProps {
  data: DataItemOut[];
  uploadedAt?: Record<string, string>;
  onRowClick?: (item: DataItemOut) => void;
}

/**
 * CONSOLE.md §5.2 — 데이터함 테이블: 데이터(아이콘+이름+청크수) · 유형 · 부서
 * · 등급 배지(L1~L5/PRIVATE) · 색인 상태 · 업로드 시각 · 사용 프로젝트 수.
 */
export function LibraryTable({ data, uploadedAt, onRowClick }: LibraryTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card py-10 text-center">
        <p className="text-sm text-muted-foreground">표시할 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>데이터</TableHead>
          <TableHead>유형</TableHead>
          <TableHead>부서</TableHead>
          <TableHead>등급</TableHead>
          <TableHead>색인 상태</TableHead>
          <TableHead>업로드 시각</TableHead>
          <TableHead className="text-right">연결 프로젝트</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((d) => {
          const Icon = DOC_ICON[d.doc_type] ?? FileText;
          const indexing = d.index_status === "indexing";
          return (
            <TableRow
              key={d.id}
              className={cn(onRowClick && "cursor-pointer")}
              onClick={() => onRowClick?.(d)}
            >
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="truncate">{d.filename || d.id}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {d.chunk_count ?? 0} 청크
                    </span>
                  </div>
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
                <span className={cn(indexing && "animate-pulse")}>
                  {INDEX_STATUS_LABEL[d.index_status] ?? d.index_status}
                  {d.index_status === "indexed" && ` (${d.chunk_count ?? 0})`}
                </span>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {formatTime(uploadedAt?.[d.id] ?? null)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                {d.attached_project_count ?? 0}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
