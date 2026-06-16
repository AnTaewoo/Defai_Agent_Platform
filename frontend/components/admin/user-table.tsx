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
import type { UserOut } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface UserTableProps {
  users: UserOut[];
  onSelect: (user: UserOut) => void;
  className?: string;
}

/**
 * OPS_CONSOLE.md §3.2 — user 테이블: 이름 · 소속 · 클리어런스 배지 · 프로젝트 수 · 마지막 접속.
 * 행 클릭 → ClearanceSheet.
 */
export function UserTable({ users, onSelect, className }: UserTableProps) {
  return (
    <Table className={cn(className)}>
      <TableHeader>
        <TableRow>
          <TableHead>이름</TableHead>
          <TableHead>클리어런스</TableHead>
          <TableHead className="text-right">프로젝트 수</TableHead>
          <TableHead className="text-right">마지막 접속</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow
            key={u.id}
            className="cursor-pointer"
            onClick={() => onSelect(u)}
          >
            <TableCell className="font-medium">
              <div className="flex flex-col">
                <span>{u.name}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {u.id}
                  {u.is_initial_admin ? " · 초기 admin" : ""}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <SecurityBadge level={u.level} visibility="shared" />
            </TableCell>
            <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
              {u.project_count}
            </TableCell>
            <TableCell className="text-right font-mono text-xs text-muted-foreground">
              {u.last_seen_at ? new Date(u.last_seen_at).toLocaleString("ko-KR") : "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
