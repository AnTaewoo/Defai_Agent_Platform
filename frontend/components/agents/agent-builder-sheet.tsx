"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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
import { createProjectAgent, getLlmEndpoints } from "@/lib/api/client";
import type { AgentOut, LlmEndpointOut } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";
import { Plus } from "lucide-react";

interface AgentBuilderSheetProps {
  onCreate: (agent: AgentOut) => void;
}

/**
 * CONSOLE.md §5.5 — 에이전트 편입 Sheet(project_admin):
 * 이름 · 설명 · 공개(공용/PRIVATE) · 서빙 모델/엔드포인트 선택.
 * 보안등급은 선택한 서빙 모델 등급에서 자동 부여(직접 입력 없음).
 * 엔드포인트 목록은 실시간 DB 조회 — admin이 변경한 서빙 등급이 즉시 반영됨.
 */
export function AgentBuilderSheet({ onCreate }: AgentBuilderSheetProps) {
  const { ctx } = useSession();
  const { projectId } = useParams<{ projectId: string }>();
  const [open, setOpen] = useState(false);
  const [endpoints, setEndpoints] = useState<LlmEndpointOut[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shared, setShared] = useState(true);
  const [endpointId, setEndpointId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch real endpoints when sheet opens
  useEffect(() => {
    if (!open) return;
    getLlmEndpoints(ctx)
      .then((eps) => {
        setEndpoints(eps);
        if (eps.length > 0 && !endpointId) {
          setEndpointId(eps[0].id);
        }
      })
      .catch(console.error);
  }, [open, ctx.principal.user_id]);

  const selectedEndpoint = endpoints.find((e) => e.id === endpointId);

  function reset() {
    setName("");
    setDescription("");
    setShared(true);
    setEndpointId("");
    setError(null);
  }

  async function handleCreate() {
    if (!name.trim() || !selectedEndpoint || !projectId) return;
    setSubmitting(true);
    setError(null);
    try {
      const agent = await createProjectAgent(
        ctx,
        projectId,
        name.trim(),
        description.trim(),
        selectedEndpoint.id,
        shared ? "shared" : "private",
      );
      onCreate(agent);
      setOpen(false);
      reset();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "에이전트 생성에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
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
            {endpoints.length === 0 ? (
              <p className="text-xs text-muted-foreground">불러오는 중…</p>
            ) : (
              <Select value={endpointId} onValueChange={(v) => setEndpointId(v ?? "")}>
                <SelectTrigger id="agent-endpoint" className="w-full">
                  <SelectValue placeholder="모델 선택" />
                </SelectTrigger>
                <SelectContent>
                  {endpoints.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      <span className="flex flex-1 items-center justify-between gap-2">
                        <span>
                          {e.model} ({e.source})
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          L{e.max_security_level}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedEndpoint && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-2">
              <span className="text-xs text-muted-foreground">자동 부여 등급</span>
              <SecurityBadge
                level={selectedEndpoint.max_security_level}
                visibility={shared ? "shared" : "private"}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch id="agent-shared" checked={shared} onCheckedChange={setShared} />
            <Label htmlFor="agent-shared" className="text-sm">
              {shared ? "공용 — 클리어런스 충족 멤버 전원 열람" : "PRIVATE — 본인 + admin만"}
            </Label>
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>

        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            취소
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || !selectedEndpoint || submitting}
          >
            {submitting ? "편입 중…" : "편입"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
