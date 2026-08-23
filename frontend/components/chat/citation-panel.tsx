"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SecurityBadge } from "@/components/security/security-badge";
import type { ChunkOut, DataItemOut } from "@/lib/api/types";
import { BookOpen } from "lucide-react";

interface CitationSource {
  data: DataItemOut;
  chunk?: ChunkOut;
}

interface CitationPanelProps {
  sources: CitationSource[];
}

/** CONSOLE.md §5.6 — 출처 사이드패널: 데이터명 + 등급 배지 + 인용 청크 + 저장된 한 줄 요약. */
export function CitationPanel({ sources }: CitationPanelProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <BookOpen className="size-4" />
          출처
        </CardTitle>
        <CardDescription>이번 응답에 사용된 데이터</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {sources.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            아직 응답이 없습니다. 메시지를 보내면 출처가 표시됩니다.
          </p>
        ) : (
          sources.map(({ data: s, chunk }) => (
            <div key={s.id} className="space-y-1.5 rounded-md border border-border bg-card px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {s.filename || s.id}
                </span>
                <SecurityBadge level={s.security_level} visibility={s.visibility} />
              </div>
              {chunk ? (
                <>
                  {chunk.summary && (
                    <p className="text-[11px] font-medium leading-snug text-foreground">
                      {chunk.summary}
                    </p>
                  )}
                  <p className="line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                    {chunk.text}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">청크 정보 없음</p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
