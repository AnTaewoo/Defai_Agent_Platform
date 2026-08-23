import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiItem {
  label: string;
  value: string | number;
  hint?: string;
}

interface GlobalKpiProps {
  items: KpiItem[];
  className?: string;
}

/**
 * OPS_CONSOLE.md §3.1 — 전역 KPI: 전체 user 수 · 전체 프로젝트 · 색인 데이터(공용/개인 합) · 활성 에이전트.
 * mist 카드 + sage 헤어라인. 숫자는 mono로 정밀 계기 느낌.
 */
export function GlobalKpi({ items, className }: GlobalKpiProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-4", className)}>
      {items.map((item) => (
        <Card key={item.label} className="gap-2">
          <CardHeader>
            <CardDescription className="font-mono text-[11px] uppercase tracking-widest">
              {item.label}
            </CardDescription>
            <CardTitle className="font-mono text-2xl font-semibold tabular-nums">
              {item.value}
            </CardTitle>
          </CardHeader>
          {item.hint && (
            <CardContent className="pt-0 text-xs text-muted-foreground">{item.hint}</CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
