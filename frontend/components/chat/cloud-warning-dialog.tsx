"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CloudWarningDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * CONSOLE.md §5.6 — cloud + L3 경고: LLM 소스가 cloud이고 선택된 데이터/에이전트 중
 * security_level >= 3이 포함되면 전송 전 확인. 차단 없이 진행/취소(진행 시 admin 책임,
 * audit 기록). on-prem이면 이 다이얼로그는 트리거되지 않는다.
 */
export function CloudWarningDialog({ open, onConfirm, onCancel }: CloudWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>외부 LLM 전송 경고</DialogTitle>
          <DialogDescription>
            현재 LLM이 cloud API를 사용 중입니다. 이 데이터는 L3 이상 보안으로 외부 전송이
            위험할 수 있습니다. 그래도 진행하시겠습니까?
          </DialogDescription>
        </DialogHeader>
        <p className="font-mono text-[11px] text-muted-foreground">
          진행 시 admin 책임으로 처리되며 audit에 기록됩니다.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            취소
          </Button>
          <Button onClick={onConfirm}>진행</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
