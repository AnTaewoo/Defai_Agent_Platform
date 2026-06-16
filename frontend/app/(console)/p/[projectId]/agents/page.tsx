"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { AgentGrid } from "@/components/agents/agent-grid";
import { AgentBuilderSheet } from "@/components/agents/agent-builder-sheet";
import { listProjectAgents } from "@/lib/api/client";
import type { AgentOut } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";

/** CONSOLE.md §5.5 — 에이전트: 카드 그리드 + 편입 Sheet(project_admin만). */
export default function ProjectAgentsPage() {
  const { ctx } = useSession();
  const { projectId } = useParams<{ projectId: string }>();
  const [agents, setAgents] = useState<AgentOut[]>([]);
  const [extraAgents, setExtraAgents] = useState<AgentOut[]>([]);

  useEffect(() => {
    if (!projectId) return;
    listProjectAgents(ctx, projectId).then(setAgents).catch(console.error);
  }, [projectId, ctx.principal.user_id]);

  const canBuild = ctx.membership.role === "project_admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-xl font-semibold tracking-wide text-foreground">
            에이전트
          </h1>
          <p className="text-sm text-muted-foreground">
            공용 에이전트 + 내가 만든 공용/private 에이전트. 클리어런스 미달 등급은 목록에서
            자동 제외됩니다.
          </p>
        </div>
        {canBuild && (
          <AgentBuilderSheet onCreate={(a) => setExtraAgents((prev) => [a, ...prev])} />
        )}
      </div>

      <AgentGrid agents={[...agents, ...extraAgents]} />
    </div>
  );
}
