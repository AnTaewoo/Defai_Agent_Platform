"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SecurityBadge } from "@/components/security/security-badge";
import type { AgentOut, DataItemOut } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Bot, Check, Database } from "lucide-react";

interface SourcePickerProps {
  data: DataItemOut[];
  agents: AgentOut[];
  selectedDataIds: string[];
  selectedAgentId: string | null;
  onToggleData: (id: string) => void;
  onSelectAgent: (id: string) => void;
}

/**
 * CONSOLE.md §5.6 — 소스 선택: 데이터 다중 선택(프로젝트에 연결된 데이터 중)
 * + 에이전트 1개 선택(공용 + 내가 만든 공용/private 중 택1). 세션 컨텍스트에 실린다.
 */
export function SourcePicker({
  data,
  agents,
  selectedDataIds,
  selectedAgentId,
  onToggleData,
  onSelectAgent,
}: SourcePickerProps) {
  return (
    <div className="flex h-full flex-col gap-4">
      <Card className="flex-1 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Database className="size-4" />
            데이터 (다중 선택)
          </CardTitle>
          <CardDescription>프로젝트에 연결된 데이터 중 선택</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {data.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              연결된 데이터가 없습니다.
            </p>
          ) : (
            data.map((d) => {
              const checked = selectedDataIds.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onToggleData(d.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md border border-border px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted/60",
                    checked && "bg-muted",
                  )}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-sm border border-border",
                        checked && "border-foreground bg-foreground text-background",
                      )}
                    >
                      {checked && <Check className="size-3" />}
                    </span>
                    <span className="truncate">{d.filename || d.id}</span>
                  </div>
                  <SecurityBadge level={d.security_level} visibility={d.visibility} />
                </button>
              );
            })
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bot className="size-4" />
            에이전트 (1개 선택)
          </CardTitle>
          <CardDescription>공용 + 내 에이전트 중 택1</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {agents.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              가용한 에이전트가 없습니다.
            </p>
          ) : (
            agents.map((a) => {
              const selected = selectedAgentId === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onSelectAgent(a.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md border border-border px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted/60",
                    selected && "bg-muted",
                  )}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border border-border",
                        selected && "border-foreground",
                      )}
                    >
                      {selected && <span className="size-2 rounded-full bg-foreground" />}
                    </span>
                    <span className="truncate">{a.name}</span>
                  </div>
                  <SecurityBadge level={a.security_level} visibility={a.visibility} />
                </button>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
