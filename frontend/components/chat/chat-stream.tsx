"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, getLlmSource, listProjectAgents, listProjectData, sendChatMessage } from "@/lib/api/client";
import { CitationPanel } from "@/components/chat/citation-panel";
import { CloudWarningDialog } from "@/components/chat/cloud-warning-dialog";
import { MessageList, type ChatMessage } from "@/components/chat/message-list";
import { SourcePicker } from "@/components/chat/source-picker";
import type { AgentOut, ChunkOut, DataItemOut, LlmSourceStatus, SessionContext } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";
import { Send } from "lucide-react";

/**
 * CONSOLE.md §5.6 — 챗(SSE) + 출처 사이드패널.
 * 비-스트리밍 백엔드에서 완결된 ArtifactOut을 받은 뒤 word-by-word로 렌더링.
 * cloud + L3↑ 선택 시 전송 전 경고(절대원칙 6).
 */
export function ChatStream() {
  const { ctx } = useSession();
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId ?? ctx.membership.project_id;

  // URL의 projectId로 membership을 오버라이드한 ctx (chat은 특정 프로젝트 스코프)
  const chatCtx: SessionContext = useMemo(
    () => ({ ...ctx, membership: { ...ctx.membership, project_id: projectId } }),
    [ctx, projectId],
  );

  const [projectData, setProjectData] = useState<DataItemOut[]>([]);
  const [agents, setAgents] = useState<AgentOut[]>([]);
  const [llmSource, setLlmSource] = useState<LlmSourceStatus | null>(null);

  const [selectedDataIds, setSelectedDataIds] = useState<string[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(
    ctx.active_agent_id ?? null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sources, setSources] = useState<Array<{ data: DataItemOut; chunk?: ChunkOut }>>([]);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [warningOpen, setWarningOpen] = useState(false);
  const streamTimer = useRef<number | null>(null);

  useEffect(() => {
    listProjectData(chatCtx, projectId)
      .then((data) => {
        setProjectData(data);
        setSelectedDataIds(data.map((d) => d.id));
      })
      .catch(console.error);
    listProjectAgents(chatCtx, projectId)
      .then((a) => {
        setAgents(a);
        setSelectedAgentId((prev) => prev ?? a[0]?.id ?? null);
      })
      .catch(console.error);
    getLlmSource(chatCtx).then(setLlmSource).catch(console.error);
  }, [projectId, ctx.principal.user_id]);

  function toggleData(id: string) {
    setSelectedDataIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  }

  function needsCloudWarning(dataIds: string[]) {
    if (llmSource?.mode !== "cloud") return false;
    const dataLevels = projectData
      .filter((d) => dataIds.includes(d.id))
      .map((d) => d.security_level);
    const agentLevel = agents.find((a) => a.id === selectedAgentId)?.security_level ?? 0;
    return [...dataLevels, agentLevel].some((lvl) => lvl >= 3);
  }

  function revealWordByWord(assistantId: string, text: string) {
    const words = text.split(" ");
    let i = 0;
    streamTimer.current = window.setInterval(() => {
      i += 1;
      const content = words.slice(0, i).join(" ");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content, streaming: i < words.length }
            : m,
        ),
      );
      if (i >= words.length && streamTimer.current) {
        window.clearInterval(streamTimer.current);
        streamTimer.current = null;
      }
    }, 45);
  }

  async function startStream(query: string) {
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: query };
    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);

    try {
      const artifact = await sendChatMessage(chatCtx, query, selectedDataIds, selectedAgentId);
      const chunkBySource = new Map<string, ChunkOut>();
      for (const c of artifact.chunks_used ?? []) {
        if (!chunkBySource.has(c.source)) chunkBySource.set(c.source, c);
      }
      setSources(
        projectData
          .filter((d) => artifact.source_ids.includes(d.id))
          .map((d) => ({ data: d, chunk: chunkBySource.get(d.id) })),
      );
      revealWordByWord(assistantId, artifact.content || "(응답 내용이 없습니다.)");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `요청 실패 (${err.status}): ${err.message}`
          : "백엔드에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: message, streaming: false } : m,
        ),
      );
    }
  }

  function handleSend() {
    const query = input.trim();
    if (!query) return;
    setInput("");

    if (needsCloudWarning(selectedDataIds)) {
      setPendingQuery(query);
      setWarningOpen(true);
      return;
    }
    void startStream(query);
  }

  function confirmCloudSend() {
    setWarningOpen(false);
    if (pendingQuery) {
      void startStream(pendingQuery);
      setPendingQuery(null);
    }
  }

  function cancelCloudSend() {
    setWarningOpen(false);
    setPendingQuery(null);
  }

  return (
    <div className="grid h-[calc(100vh-7.5rem)] gap-4 lg:grid-cols-[260px_1fr_280px]">
      <div className="hidden lg:block">
        <SourcePicker
          data={projectData}
          agents={agents}
          selectedDataIds={selectedDataIds}
          selectedAgentId={selectedAgentId}
          onToggleData={toggleData}
          onSelectAgent={setSelectedAgentId}
        />
      </div>

      <div className="flex h-full flex-col gap-3 overflow-hidden rounded-xl border border-border bg-background p-3">
        <div className="flex-1 overflow-hidden">
          <MessageList messages={messages} />
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="메시지를 입력하세요 (Shift+Enter로 줄바꿈)"
            className="min-h-10 flex-1 resize-none"
          />
          <Button onClick={handleSend} disabled={!input.trim()}>
            <Send />
            전송
          </Button>
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">
          데이터 {selectedDataIds.length}건 · 에이전트{" "}
          {agents.find((a) => a.id === selectedAgentId)?.name ?? "미선택"} · LLM{" "}
          {llmSource?.mode === "cloud" ? "CLOUD · 외부" : "ON-PREM"}
        </p>
      </div>

      <div className="hidden lg:block">
        <CitationPanel sources={sources} />
      </div>

      <CloudWarningDialog
        open={warningOpen}
        onConfirm={confirmCloudSend}
        onCancel={cancelCloudSend}
      />
    </div>
  );
}
