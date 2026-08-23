"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SecurityBadge } from "@/components/security/security-badge";
import type { DataItemOut } from "@/lib/api/types";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddDataListProps {
  candidates: DataItemOut[];
  attachedIds: Set<string>;
  onAttach: (item: DataItemOut) => void;
}

/**
 * CONSOLE.md §5.4 — 데이터 추가: 이미 업로드된 데이터(내 라이브러리 + 접근 가능한 공용)에서
 * 선택해 프로젝트에 연결(attach). 새 파일 업로드는 /data에서. 로컬 state로 시뮬레이션.
 */
export function AddDataList({ candidates, attachedIds, onAttach }: AddDataListProps) {
  const [justAttached, setJustAttached] = useState<Set<string>>(new Set());

  function handleAttach(item: DataItemOut) {
    onAttach(item);
    setJustAttached((prev) => new Set(prev).add(item.id));
  }

  if (candidates.length === 0) {
    return (
      <p className="rounded-md border border-border bg-card py-10 text-center text-sm text-muted-foreground">
        연결할 수 있는 데이터가 없습니다. 데이터함에서 먼저 업로드하세요.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {candidates.map((item) => {
        const attached = attachedIds.has(item.id) || justAttached.has(item.id);
        return (
          <Card key={item.id} className="flex-row items-center justify-between gap-3 px-4 py-3">
            <CardContent className="flex flex-1 items-center gap-3 p-0">
              <div className="flex flex-col gap-0.5">
                <CardTitle className="text-sm">{item.filename || item.id}</CardTitle>
                <CardDescription className="font-mono text-[11px]">
                  {item.doc_type.toUpperCase()} · {item.chunk_count ?? 0} 청크 ·{" "}
                  {item.dept ?? "부서 미지정"} · 소유자 {item.owner_id}
                </CardDescription>
              </div>
            </CardContent>
            <CardHeader className="p-0">
              <div className="flex items-center gap-2">
                <SecurityBadge level={item.security_level} visibility={item.visibility} />
                <Button
                  size="sm"
                  variant={attached ? "outline" : "default"}
                  disabled={attached}
                  onClick={() => handleAttach(item)}
                  className={cn(attached && "text-muted-foreground")}
                >
                  {attached ? (
                    <>
                      <Check />
                      연결됨
                    </>
                  ) : (
                    "연결"
                  )}
                </Button>
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
