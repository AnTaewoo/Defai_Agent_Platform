"use client";

import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
import { Trash2 } from "lucide-react";

const INDEX_STATUS_LABEL: Record<string, string> = {
  indexed: "색인 완료",
  indexing: "색인 중",
  failed: "색인 실패",
};

const LEVELS: SecurityLevel[] = [1, 2, 3, 4, 5];

interface DataTableProps {
  rows: AdminDataRow[];
  onLevelChange: (dataId: string, nextLevel: SecurityLevel) => void;
  onDelete: (dataId: string) => Promise<void>;
}

/**
 * OPS_CONSOLE.md §3.3 — 전 user 데이터 테이블: 데이터 · 소유자 ·
 * 등급 배지(PRIVATE 포함) · 색인 상태 · 업로드 시각 · 연결 프로젝트 수 · 삭제.
 */
export function DataTable({ rows, onLevelChange, onDelete }: DataTableProps) {
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(dataId: string) {
    setDeleting(dataId);
    try {
      await onDelete(dataId);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>데이터</TableHead>
          <TableHead>소유자</TableHead>
          <TableHead>등급</TableHead>
          <TableHead>색인 상태</TableHead>
          <TableHead>업로드 시각</TableHead>
          <TableHead className="text-right">연결 프로젝트</TableHead>
          <TableHead />
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
              <TableCell className="w-10 text-right">
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        disabled={deleting === row.id}
                      />
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>데이터 삭제</AlertDialogTitle>
                      <AlertDialogDescription>
                        <span className="font-medium text-foreground">{row.source}</span>을(를)
                        삭제합니다. 파일·청크·프로젝트 연결이 모두 제거되며 복구할 수 없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => void handleDelete(row.id)}
                      >
                        삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
