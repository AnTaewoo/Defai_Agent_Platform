import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SecurityBadge } from "@/components/security/security-badge";
import { cn } from "@/lib/utils";
import { MOCK_INFRA } from "@/lib/api/mock";

type ModelStatus = (typeof MOCK_INFRA.models)[number]["status"] | "degraded";

const STATUS_DOT: Record<ModelStatus, string> = {
  serving: "bg-security-1",
  degraded: "bg-security-3",
};

const STATUS_LABEL: Record<ModelStatus, string> = {
  serving: "서빙 중",
  degraded: "성능 저하",
};

/**
 * OPS_CONSOLE.md §3.7 — 모델별 할당 노드 · local LLM(엔진) · 서빙 보안등급 · 큐 · 상태.
 * "어떤 모델이 어느 노드에서 어떤 LLM으로 도는가"를 한눈에.
 */
export function ResourceModels() {
  return (
    <Card className="p-0">
      <CardHeader className="border-b border-border [.border-b]:pb-4">
        <CardTitle className="text-sm">모델 ↔ 노드 ↔ local LLM 할당</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>모델</TableHead>
              <TableHead>엔진</TableHead>
              <TableHead>할당 노드</TableHead>
              <TableHead>서빙 등급</TableHead>
              <TableHead>큐</TableHead>
              <TableHead className="text-right">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_INFRA.models.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="truncate">{m.model}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{m.id}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{m.engine}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{m.node}</TableCell>
                <TableCell>
                  <SecurityBadge level={m.maxSecurityLevel} visibility="shared" />
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                  {m.queue}
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    <span className={cn("size-1.5 rounded-full", STATUS_DOT[m.status])} aria-hidden />
                    {STATUS_LABEL[m.status]}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
