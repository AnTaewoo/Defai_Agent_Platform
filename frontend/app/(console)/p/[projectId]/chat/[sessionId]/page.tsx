import { ChatStream } from "@/components/chat/chat-stream";

/** CONSOLE.md §5.6 — 채팅: 소스 선택 + 메시지 스트림 + 출처 사이드패널. */
export default function ProjectChatPage() {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold tracking-wide text-foreground">채팅</h1>
        <p className="text-sm text-muted-foreground">
          프로젝트 멤버 전원(viewer 포함) 가능. 보이는 데이터·에이전트는 본인 클리어런스 이하로
          필터된 것만 표시됩니다.
        </p>
      </div>
      <ChatStream />
    </div>
  );
}
