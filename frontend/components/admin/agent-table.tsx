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
import { SECURITY_LEVEL_NAMES, type AdminAgentRow } from "@/lib/api/admin-mock";
import type { SecurityLevel } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const LEVELS: SecurityLevel[] = [1, 2, 3, 4, 5];

const STATUS_DOT: Record<AdminAgentRow["status"], string> = {
  idle: "bg-muted-foreground",
  searching: "bg-security-2",
  busy: "bg-security-3",
};

const STATUS_LABEL: Record<AdminAgentRow["status"], string> = {
  idle: "대기",
  searching: "검색 중",
  busy: "사용 중",
};

interface AgentTableProps {
  rows: AdminAgentRow[];
  onRequestLevelChange: (agentId: string, nextLevel: SecurityLevel) => void;
}

/**
 * OPS_CONSOLE.md §3.4 — 전 user 에이전트 테이블: 에이전트 · 소유자 · 프로젝트 ·
 * 등급 배지(PRIVATE 포함) · LED 상태. 등급 변경 = admin이 사유와 함께 조정.
 */
export function AgentTable({ rows, onRequestLevelChange }: AgentTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>에이전트</TableHead>
          <TableHead>소유자</TableHead>
          <TableHead>프로젝트</TableHead>
          <TableHead>등급</TableHead>
          <TableHead className="text-right">상태</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">
              <div className="flex flex-col">
                <span className="truncate">{row.name}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{row.description}</span>
              </div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{row.ownerName}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{row.projectName}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <SecurityBadge level={row.securityLevel} visibility={row.visibility} />
                <Select
                  value={String(row.securityLevel)}
                  onValueChange={(v) => {
                    if (!v) return;
                    onRequestLevelChange(row.id, Number(v) as SecurityLevel);
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
            <TableCell className="text-right">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                <span className={cn("size-1.5 rounded-full", STATUS_DOT[row.status])} aria-hidden />
                {STATUS_LABEL[row.status]}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
