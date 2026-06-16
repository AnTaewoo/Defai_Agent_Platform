"use client";

import { useEffect, useRef } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface MessageListProps {
  messages: ChatMessage[];
}

/** CONSOLE.md §5.6 — ScrollArea 메시지 + SSE 토큰 스트리밍(페이드인) 표현. */
export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-3 p-1">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            소스를 선택하고 메시지를 보내 대화를 시작하세요.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-xl border border-border px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-foreground text-background"
                  : "bg-card text-card-foreground",
              )}
            >
              {m.content}
              {m.streaming && (
                <span className="ml-0.5 inline-block w-1.5 animate-pulse text-muted-foreground">
                  ▌
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
