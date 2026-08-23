"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClearanceSheet } from "@/components/admin/clearance-sheet";
import { UserTable } from "@/components/admin/user-table";
import { getAdminUsers, patchUserLevel } from "@/lib/api/client";
import type { AdminUserOut, AuditEntry, SecurityLevel, UserOut } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";

function toUserOut(u: AdminUserOut): UserOut {
  return { ...u, last_seen_at: null };
}

/**
 * OPS_CONSOLE.md §3.2 — 사용자(클리어런스) 관리.
 * 클리어런스 변경은 DB에 실시간 반영(PATCH /admin/users/{id}/level).
 */
export default function AdminUsersPage() {
  const { ctx } = useSession();
  const [users, setUsers] = useState<UserOut[]>([]);
  const [selected, setSelected] = useState<UserOut | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [recentChanges, setRecentChanges] = useState<AuditEntry[]>([]);

  useEffect(() => {
    getAdminUsers(ctx)
      .then((list) => setUsers(list.map(toUserOut)))
      .catch(console.error);
  }, [ctx.principal.user_id]);

  function handleSelect(user: UserOut) {
    setSelected(user);
    setSheetOpen(true);
  }

  async function handleLevelChange(userId: string, nextLevel: SecurityLevel) {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const prevLevel = target.level;

    // Optimistic update
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, level: nextLevel } : u)));
    setSelected((prev) => (prev && prev.id === userId ? { ...prev, level: nextLevel } : prev));

    try {
      await patchUserLevel(ctx, userId, nextLevel);

      const entry: AuditEntry = {
        id: `a-local-${Date.now()}`,
        at: new Date().toISOString(),
        user_id: ctx.principal.user_id,
        action: "level_change",
        detail: `${target.name}(${userId}) 클리어런스 L${prevLevel} → L${nextLevel} 변경${
          nextLevel === 5 ? " (admin 승격)" : ""
        }`,
        severity: nextLevel === 5 || prevLevel === 5 ? "warn" : "info",
      };
      setRecentChanges((prev) => [entry, ...prev]);
    } catch (err) {
      // Revert on failure
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, level: prevLevel } : u)));
      setSelected((prev) => (prev && prev.id === userId ? { ...prev, level: prevLevel } : prev));
      console.error("클리어런스 변경 실패:", err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold tracking-wide text-foreground">사용자</h1>
        <p className="text-sm text-muted-foreground">
          전 user의 클리어런스를 관리합니다. 행을 클릭하면 활동 타임라인을 확인할 수 있습니다.
        </p>
      </div>

      <Card className="p-0">
        <CardHeader className="border-b border-border [.border-b]:pb-4">
          <CardTitle className="text-sm">전체 사용자 ({users.length})</CardTitle>
          <CardDescription>L1~L5 클리어런스 · L5 부여 = 관리자 콘솔 접근 권한</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <UserTable users={users} onSelect={handleSelect} />
        </CardContent>
      </Card>

      {recentChanges.length > 0 && (
        <Card className="p-0">
          <CardHeader className="border-b border-border [.border-b]:pb-4">
            <CardTitle className="text-sm">최근 클리어런스 변경</CardTitle>
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

      <ClearanceSheet
        user={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onLevelChange={handleLevelChange}
      />
    </div>
  );
}
