import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * OPS_CONSOLE.md §3.7 — 리소스 대시보드: 노드별 GPU/CPU/RAM.
 * 실제 리소스 측정은 인프라 에이전트(미구현) 연동 후 활성화 예정.
 */
export function ResourceNodes() {
  return (
    <Card className="gap-2">
      <CardContent className="flex items-center gap-3 pt-4">
        <span className={cn("size-1.5 shrink-0 rounded-full bg-security-3")} aria-hidden />
        <span className="text-sm text-muted-foreground">
          노드 리소스(GPU/CPU/RAM) 실시간 측정은 인프라 에이전트 연동 후 제공됩니다. 현재 미구현.
        </span>
      </CardContent>
    </Card>
  );
}
