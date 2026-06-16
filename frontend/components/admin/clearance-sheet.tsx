"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SecurityBadge } from "@/components/security/security-badge";
import {
  MOCK_USER_ACTIVITY,
  SECURITY_LEVEL_NAMES,
  USER_ACTIVITY_LABEL,
  type UserActivityKind,
} from "@/lib/api/admin-mock";
import type { SecurityLevel, UserOut } from "@/lib/api/types";
import { ShieldAlert } from "lucide-react";

const ACTIVITY_DOT: Record<UserActivityKind, string> = {
  login: "bg-security-1",
  logout: "bg-muted-foreground",
  upload: "bg-security-2",
  agent_join: "bg-security-2",
  access_denied: "bg-security-5",
  level_change: "bg-security-3",
};

const LEVELS: SecurityLevel[] = [1, 2, 3, 4, 5];

interface ClearanceSheetProps {
  user: UserOut | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLevelChange: (userId: string, nextLevel: SecurityLevel) => void;
}

/**
 * OPS_CONSOLE.md §3.2 — user Sheet: 로그인 이력 · 업로드 · 에이전트 편입 ·
 * 권한 초과 시도 · 클리어런스 변경 타임라인 + L1~L5 승격/강등.
 * L5 부여 = admin 승격 → 확인 dialog. 초기 admin은 강등 불가.
 */
export function ClearanceSheet({ user, open, onOpenChange, onLevelChange }: ClearanceSheetProps) {
  const [pendingLevel, setPendingLevel] = useState<SecurityLevel | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!user) return null;

  const activity = MOCK_USER_ACTIVITY[user.id] ?? [];
  const isInitialAdmin = user.is_initial_admin === true;

  function requestLevelChange(next: SecurityLevel) {
    if (next === user!.level) return;
    // L5 승격(admin 권한 부여)은 확인 dialog를 거친다. 초기 admin의 강등은 셀렉터 자체가 disabled.
    if (next === 5) {
      setPendingLevel(next);
      setConfirmOpen(true);
      return;
    }
    onLevelChange(user!.id, next);
  }

  function confirmLevelChange() {
    if (pendingLevel === null) return;
    onLevelChange(user!.id, pendingLevel);
    setPendingLevel(null);
    setConfirmOpen(false);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-heading">{user.name}</SheetTitle>
            <SheetDescription>
              {user.dept} · 마지막 접속{" "}
              {user.last_seen_at ? new Date(user.last_seen_at).toLocaleString("ko-KR") : "-"}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4">
            <div className="space-y-2">
              <Label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                클리어런스
              </Label>
              <div className="flex items-center gap-2">
                <SecurityBadge level={user.level} visibility="shared" />
                <Select
                  value={String(user.level)}
                  onValueChange={(v) => {
                    if (!v) return;
                    requestLevelChange(Number(v) as SecurityLevel);
                  }}
                  disabled={isInitialAdmin}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="등급 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((lvl) => (
                      <SelectItem key={lvl} value={String(lvl)}>
                        {`L${lvl} ${SECURITY_LEVEL_NAMES[lvl]}`}
                        {lvl === 5 ? " · admin" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isInitialAdmin ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldAlert className="size-3.5" />
                  초기 admin은 클리어런스가 L5로 고정되며 강등할 수 없습니다.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  L5 승격은 관리자 콘솔 접근 권한을 부여합니다. 변경 시 감사 로그에 기록됩니다.
                </p>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                활동 타임라인
              </Label>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">기록된 활동이 없습니다.</p>
              ) : (
                <ol className="space-y-3">
                  {activity.map((entry) => (
                    <li key={entry.id} className="flex gap-3">
                      <span
                        className={`mt-1.5 size-1.5 shrink-0 rounded-full ${ACTIVITY_DOT[entry.kind]}`}
                        aria-hidden
                      />
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {USER_ACTIVITY_LABEL[entry.kind]}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {new Date(entry.at).toLocaleString("ko-KR")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{entry.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>L5(admin) 승격 확인</DialogTitle>
            <DialogDescription>
              {`${user.name}님에게 L5 클리어런스를 부여하면 관리자 콘솔(/admin/*) 전체 접근 권한이 생깁니다. 계속하시겠습니까?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button onClick={confirmLevelChange}>L5 승격 확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
