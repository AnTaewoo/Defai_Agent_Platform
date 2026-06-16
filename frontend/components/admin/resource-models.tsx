"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SecurityBadge } from "@/components/security/security-badge";
import { SECURITY_LEVEL_NAMES } from "@/lib/api/admin-mock";
import { getAdminLlmEndpoints, patchLlmEndpointLevel } from "@/lib/api/client";
import type { LlmEndpointOut, SecurityLevel } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";
import { cn } from "@/lib/utils";

const LEVELS: SecurityLevel[] = [1, 2, 3, 4, 5];

/**
 * OPS_CONSOLE.md §3.7 — 모델별 할당 노드 · local LLM(엔진) · 서빙 보안등급 · 상태.
 * 서빙 등급(max_security_level)은 admin이 직접 변경 가능 — DB에 즉시 반영.
 */
export function ResourceModels() {
  const { ctx } = useSession();
  const [endpoints, setEndpoints] = useState<LlmEndpointOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminLlmEndpoints(ctx)
      .then(setEndpoints)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ctx.principal.user_id]);

  async function handleLevelChange(endpointId: string, nextLevel: SecurityLevel) {
    const prev = endpoints.find((e) => e.id === endpointId);
    if (!prev || prev.max_security_level === nextLevel) return;

    // Optimistic update
    setEndpoints((es) =>
      es.map((e) => (e.id === endpointId ? { ...e, max_security_level: nextLevel } : e)),
    );

    try {
      const updated = await patchLlmEndpointLevel(ctx, endpointId, nextLevel);
      setEndpoints((es) => es.map((e) => (e.id === endpointId ? updated : e)));
    } catch (err) {
      // Revert on failure
      setEndpoints((es) =>
        es.map((e) => (e.id === endpointId ? { ...e, max_security_level: prev.max_security_level } : e)),
      );
      console.error("서빙 등급 변경 실패:", err);
    }
  }

  return (
    <Card className="p-0">
      <CardHeader className="border-b border-border [.border-b]:pb-4">
        <CardTitle className="text-sm">LLM 엔드포인트 · 서빙 등급</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">불러오는 중…</p>
        ) : endpoints.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">등록된 엔드포인트가 없습니다.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>모델</TableHead>
                <TableHead>엔드포인트</TableHead>
                <TableHead>소스</TableHead>
                <TableHead>서빙 등급</TableHead>
                <TableHead className="text-right">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {endpoints.map((ep) => (
                <TableRow key={ep.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="truncate">{ep.model}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{ep.id}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {ep.base_url}
                  </TableCell>
                  <TableCell className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                    {ep.source}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <SecurityBadge level={ep.max_security_level} visibility="shared" />
                      <Select
                        value={String(ep.max_security_level)}
                        onValueChange={(v) => {
                          if (!v) return;
                          handleLevelChange(ep.id, Number(v) as SecurityLevel);
                        }}
                      >
                        <SelectTrigger size="sm" className="h-7 font-mono text-[11px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVELS.map((lvl) => (
                            <SelectItem key={lvl} value={String(lvl)}>
                              {`L${lvl} ${SECURITY_LEVEL_NAMES[lvl]}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                      <span className={cn("size-1.5 rounded-full bg-security-1")} aria-hidden />
                      서빙 중
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
