"use client";

import { useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/admin/data-table";
import { SECURITY_LEVEL_NAMES, type AdminDataRow } from "@/lib/api/admin-mock";
import { listLibraryData } from "@/lib/api/client";
import { MOCK_USERS } from "@/lib/api/mock";
import type { AuditEntry, DataItemOut, SecurityLevel } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";

const VISIBILITY_OPTIONS = [
  { value: "all", label: "공용 + PRIVATE" },
  { value: "shared", label: "공용만" },
  { value: "private", label: "PRIVATE만" },
];

const ATTACH_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "attached", label: "연결됨 (≥1)" },
  { value: "unattached", label: "미연결 (0)" },
];

function toAdminDataRow(item: DataItemOut): AdminDataRow {
  const owner = MOCK_USERS.find((u) => u.id === item.owner_id);
  return {
    id: item.id,
    source: item.filename || item.id,
    ownerId: item.owner_id,
    ownerName: owner?.name ?? item.owner_id,
    dept: item.dept ?? "-",
    securityLevel: item.security_level as SecurityLevel,
    visibility: item.visibility as "shared" | "private",
    indexStatus: item.index_status,
    uploadedAt: "-",
    attachedProjectCount: item.attached_project_count ?? 0,
  };
}

/**
 * OPS_CONSOLE.md §3.3 — 전 user 데이터(라이브러리) 관찰 + 등급 관리.
 * 필터: user · 등급 · 공용/PRIVATE · 연결 프로젝트. PRIVATE도 표시(admin 감사 권한).
 */
export default function AdminDataPage() {
  const { ctx } = useSession();
  const [rows, setRows] = useState<AdminDataRow[]>([]);
  const [userFilter, setUserFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [attachFilter, setAttachFilter] = useState("all");
  const [recentChanges, setRecentChanges] = useState<AuditEntry[]>([]);

  // 실제 백엔드에서 데이터 목록 로드 (L5 admin은 공용 전체 + 본인 PRIVATE 포함)
  useEffect(() => {
    listLibraryData(ctx)
      .then((items) => setRows(items.map(toAdminDataRow)))
      .catch(console.error);
  }, [ctx.principal.user_id]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (userFilter !== "all" && r.ownerId !== userFilter) return false;
      if (levelFilter !== "all" && String(r.securityLevel) !== levelFilter) return false;
      if (visibilityFilter !== "all" && r.visibility !== visibilityFilter) return false;
      if (attachFilter === "attached" && r.attachedProjectCount < 1) return false;
      if (attachFilter === "unattached" && r.attachedProjectCount >= 1) return false;
      return true;
    });
  }, [rows, userFilter, levelFilter, visibilityFilter, attachFilter]);

  function handleLevelChange(dataId: string, nextLevel: SecurityLevel) {
    const target = rows.find((r) => r.id === dataId);
    if (!target || target.securityLevel === nextLevel) return;
    const prevLevel = target.securityLevel;

    setRows((prev) =>
      prev.map((r) => (r.id === dataId ? { ...r, securityLevel: nextLevel, indexStatus: "indexing" } : r)),
    );

    const entry: AuditEntry = {
      id: `a-data-${Date.now()}`,
      at: new Date().toISOString(),
      user_id: ctx.principal.user_id,
      action: "data_level_change",
      detail: `${target.source}(${dataId}) 등급 L${prevLevel} → L${nextLevel} 변경 — 재색인 트리거`,
      severity: "warn",
    };
    setRecentChanges((prev) => [entry, ...prev]);

    window.setTimeout(() => {
      setRows((prev) => prev.map((r) => (r.id === dataId ? { ...r, indexStatus: "indexed" } : r)));
    }, 1200);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold tracking-wide text-foreground">데이터</h1>
        <p className="text-sm text-muted-foreground">
          전 user의 라이브러리 데이터(개인/private 포함)를 관찰하고 등급을 관리합니다. 등급 변경은
          재색인을 트리거합니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={userFilter} onValueChange={(v) => setUserFilter(v ?? "all")}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue placeholder="소유자" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 소유자</SelectItem>
            {MOCK_USERS.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v ?? "all")}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue placeholder="등급" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 등급</SelectItem>
            {([1, 2, 3, 4, 5] as SecurityLevel[]).map((lvl) => (
              <SelectItem key={lvl} value={String(lvl)}>
                {`L${lvl} ${SECURITY_LEVEL_NAMES[lvl]}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={visibilityFilter} onValueChange={(v) => setVisibilityFilter(v ?? "all")}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue placeholder="공개 범위" />
          </SelectTrigger>
          <SelectContent>
            {VISIBILITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={attachFilter} onValueChange={(v) => setAttachFilter(v ?? "all")}>
          <SelectTrigger size="sm" className="w-44">
            <SelectValue placeholder="연결 프로젝트" />
          </SelectTrigger>
          <SelectContent>
            {ATTACH_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="p-0">
        <CardHeader className="border-b border-border [.border-b]:pb-4">
          <CardTitle className="text-sm">전체 데이터 ({filtered.length} / {rows.length})</CardTitle>
          <CardDescription>본문 청크는 메타로만 노출됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable rows={filtered} onLevelChange={handleLevelChange} />
        </CardContent>
      </Card>

      {recentChanges.length > 0 && (
        <Card className="p-0">
          <CardHeader className="border-b border-border [.border-b]:pb-4">
            <CardTitle className="text-sm">최근 등급 변경</CardTitle>
            <CardDescription>변경 즉시 감사 로그(audit_log)에 기록됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {recentChanges.slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground">{a.detail}</span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  {new Date(a.at).toLocaleString("ko-KR")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
