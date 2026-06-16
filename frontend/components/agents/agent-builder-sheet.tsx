"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SecurityBadge } from "@/components/security/security-badge";
import { MOCK_LLM_ENDPOINTS } from "@/lib/api/mock";
import type { AgentOut, SecurityLevel } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";
import { Plus } from "lucide-react";

interface AgentBuilderSheetProps {
  onCreate: (agent: AgentOut) => void;
}

/**
 * CONSOLE.md §5.5 — 에이전트 편입 Sheet(project_admin):
 * 이름 · 설명 · 공개(공용/PRIVATE) · 서빙 모델/엔드포인트 선택.
 * 보안등급은 선택한 서빙 모델 등급에서 자동 부여(직접 입력 없음).
 * 게이트: 에이전트(=모델) 등급 ≤ 본인 클리어런스 — 초과 모델은 셀렉터 disabled + "클리어런스 초과".
 */
export function AgentBuilderSheet({ onCreate }: AgentBuilderSheetProps) {
  const { ctx } = useSession();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shared, setShared] = useState(true);
  const [endpointId, setEndpointId] = useState<string>(
    MOCK_LLM_ENDPOINTS.find((e) => e.max_security_level <= ctx.principal.level)?.id ?? "",
  );

  const selectedEndpoint = MOCK_LLM_ENDPOINTS.find((e) => e.id === endpointId);
  const assignedLevel: SecurityLevel | null = selectedEndpoint?.max_security_level ?? null;

  function reset() {
    setName("");
    setDescription("");
    setShared(true);
  }

  function handleCreate() {
    if (!name.trim() || !selectedEndpoint || !assignedLevel) return;
    const agent: AgentOut = {
      id: `agent-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      security_level: assignedLevel,
      visibility: shared ? "shared" : "private",
      owner_id: ctx.principal.user_id,
      status: "idle",
    };
    onCreate(agent);
    setOpen(false);
    reset();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button size="sm" />}>
        <Plus />
        에이전트 편입
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>에이전트 편입</SheetTitle>
          <SheetDescription>
            보안등급은 선택한 서빙 모델 등급에서 자동으로 부여됩니다. 클리어런스(L
            {ctx.principal.level})를 초과하는 모델은 선택할 수 없습니다.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4">
          <div className="space-y-1.5">
            <Label htmlFor="agent-name">이름</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 계약서 분석 에이전트"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agent-desc">설명</Label>
            <Textarea
              id="agent-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 에이전트의 용도를 간단히 적어주세요."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agent-endpoint">서빙 모델 / 엔드포인트</Label>
            <Select value={endpointId} onValueChange={(v) => setEndpointId(v ?? "")}>
              <SelectTrigger id="agent-endpoint" className="w-full">
                <SelectValue placeholder="모델 선택" />
              </SelectTrigger>
              <SelectContent>
                {MOCK_LLM_ENDPOINTS.map((e) => {
                  const exceeds = e.max_security_level > ctx.principal.level;
                  return (
                    <SelectItem key={e.id} value={e.id} disabled={exceeds}>
                      <span className="flex flex-1 items-center justify-between gap-2">
                        <span>
                          {e.model} ({e.source})
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {exceeds ? "클리어런스 초과" : `L${e.max_security_level}`}
                        </span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {assignedLevel && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-2">
              <span className="text-xs text-muted-foreground">자동 부여 등급</span>
              <SecurityBadge level={assignedLevel} visibility={shared ? "shared" : "private"} />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch id="agent-shared" checked={shared} onCheckedChange={setShared} />
            <Label htmlFor="agent-shared" className="text-sm">
              {shared ? "공용 — 클리어런스 충족 멤버 전원 열람" : "PRIVATE — 본인 + admin만"}
            </Label>
          </div>
        </div>

        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || !assignedLevel}>
            편입
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
