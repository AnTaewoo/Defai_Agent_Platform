"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SecurityBadge } from "@/components/security/security-badge";
import { SECURITY_LEVEL_NAMES, type AdminDataRow } from "@/lib/api/admin-mock";
import type { SecurityLevel } from "@/lib/api/types";

const INDEX_STATUS_LABEL: Record<string, string> = {
  indexed: "색인 완료",
  indexing: "색인 중",
  failed: "색인 실패",
};

const LEVELS: SecurityLevel[] = [1, 2, 3, 4, 5];

interface DataTableProps {
  rows: AdminDataRow[];
  onLevelChange: (dataId: string, nextLevel: SecurityLevel) => void;
}

/**
 * OPS_CONSOLE.md §3.3 — 전 user 데이터 테이블: 데이터 · 소유자 · 부서 ·
 * 등급 배지(PRIVATE 포함) · 색인 상태 · 업로드 시각 · 연결 프로젝트 수.
 * 등급 변경 셀렉터 = 재색인 트리거 시뮬레이션.
 */
export function DataTable({ rows, onLevelChange }: DataTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>데이터</TableHead>
          <TableHead>소유자</TableHead>
          <TableHead>부서</TableHead>
          <TableHead>등급</TableHead>
          <TableHead>색인 상태</TableHead>
          <TableHead>업로드 시각</TableHead>
          <TableHead className="text-right">연결 프로젝트</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
              조건에 맞는 데이터가 없습니다.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span className="truncate">{row.source}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{row.id}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{row.ownerName}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{row.dept}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <SecurityBadge level={row.securityLevel} visibility={row.visibility} />
                  <Select
                    value={String(row.securityLevel)}
                    onValueChange={(v) => {
                      if (!v) return;
                      onLevelChange(row.id, Number(v) as SecurityLevel);
                    }}
                  >
                    <SelectTrigger size="sm" className="h-7 font-mono text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((lvl) => (
                        <SelectItem key={lvl} value={String(lvl)}>
                          {`L${lvl} ${SECURITY_LEVEL_NAMES[lvl]}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {INDEX_STATUS_LABEL[row.indexStatus] ?? row.indexStatus}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {row.uploadedAt !== "-" ? new Date(row.uploadedAt).toLocaleString("ko-KR") : "-"}
              </TableCell>
              <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                {row.attachedProjectCount}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
