"use client";

import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AgentTable } from "@/components/admin/agent-table";
import { adminAgentRows, SECURITY_LEVEL_NAMES, type AdminAgentRow } from "@/lib/api/admin-mock";
import type { AuditEntry, SecurityLevel } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";

/**
 * OPS_CONSOLE.md §3.4 — 전 user 에이전트(공용+private) 관찰 + 등급 관리(사유 기록).
 */
export default function AdminAgentsPage() {
  const { ctx } = useSession();
  const [rows, setRows] = useState<AdminAgentRow[]>(() => adminAgentRows());
  const [recentChanges, setRecentChanges] = useState<AuditEntry[]>([]);
  const [pending, setPending] = useState<{ agentId: string; nextLevel: SecurityLevel } | null>(null);
  const [reason, setReason] = useState("");

  function requestLevelChange(agentId: string, nextLevel: SecurityLevel) {
    const target = rows.find((r) => r.id === agentId);
    if (!target || target.securityLevel === nextLevel) return;
    setPending({ agentId, nextLevel });
    setReason("");
  }

  function confirmLevelChange() {
    if (!pending) return;
    const target = rows.find((r) => r.id === pending.agentId);
    if (!target) return;
    const prevLevel = target.securityLevel;

    setRows((prev) =>
      prev.map((r) => (r.id === pending.agentId ? { ...r, securityLevel: pending.nextLevel } : r)),
    );

    const entry: AuditEntry = {
      id: `a-agent-${Date.now()}`,
      at: new Date().toISOString(),
      user_id: ctx.principal.user_id,
      action: "agent_level_change",
      detail: `${target.name}(${pending.agentId}) 등급 L${prevLevel} → L${pending.nextLevel} 변경${
        reason.trim() ? ` — 사유: ${reason.trim()}` : ""
      }`,
      severity: "warn",
    };
    setRecentChanges((prev) => [entry, ...prev]);
    setPending(null);
    setReason("");
  }

  const pendingTarget = pending ? rows.find((r) => r.id === pending.agentId) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold tracking-wide text-foreground">에이전트</h1>
        <p className="text-sm text-muted-foreground">
          전 user의 에이전트(공용 + private)를 관찰합니다. 등급은 생성 시 서빙 모델 등급에서 자동
          부여되며, admin이 변경 시 사유를 기록합니다. 서빙 LLM은 전역 소스를 따릅니다.
        </p>
      </div>

      <Card className="p-0">
        <CardHeader className="border-b border-border [.border-b]:pb-4">
          <CardTitle className="text-sm">전체 에이전트 ({rows.length})</CardTitle>
          <CardDescription>private 에이전트 포함 전부 노출됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <AgentTable rows={rows} onRequestLevelChange={requestLevelChange} />
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

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>에이전트 등급 변경</DialogTitle>
            <DialogDescription>
              {pendingTarget && pending
                ? `${pendingTarget.name}의 등급을 L${pendingTarget.securityLevel}(${
                    SECURITY_LEVEL_NAMES[pendingTarget.securityLevel]
                  }) → L${pending.nextLevel}(${SECURITY_LEVEL_NAMES[pending.nextLevel]})로 변경합니다. 사유를 입력하세요.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 px-1">
            <Label htmlFor="level-reason">변경 사유</Label>
            <Input
              id="level-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 서빙 모델 교체에 따른 등급 재산정"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              취소
            </Button>
            <Button onClick={confirmLevelChange}>변경 확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
