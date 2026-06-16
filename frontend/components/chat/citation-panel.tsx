"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SecurityBadge } from "@/components/security/security-badge";
import type { DataItemOut } from "@/lib/api/types";
import { BookOpen } from "lucide-react";

interface CitationPanelProps {
  sources: DataItemOut[];
}

function previewChunk(item: DataItemOut): string {
  const src = item.filename || item.id;
  const dept = item.dept ?? "출처 미지정";
  return src + "에서 검색된 관련 구간 — " + dept + " 자료 기준 응답에 인용되었습니다.";
}

/** CONSOLE.md §5.6 — 출처 사이드패널: 데이터명 + 등급 배지 + 청크 미리보기. */
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
          sources.map((s) => (
            <div key={s.id} className="space-y-1.5 rounded-md border border-border bg-card px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {s.filename || s.id}
                </span>
                <SecurityBadge level={s.security_level} visibility={s.visibility} />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{previewChunk(s)}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
