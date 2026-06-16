import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { MOCK_INFRA } from "@/lib/api/mock";

type NodeStatus = (typeof MOCK_INFRA.nodes)[number]["status"] | "offline";

const STATUS_DOT: Record<NodeStatus, string> = {
  active: "bg-security-1",
  congested: "bg-security-3",
  offline: "bg-security-5",
};

const STATUS_LABEL: Record<NodeStatus, string> = {
  active: "활성",
  congested: "혼잡",
  offline: "오프라인",
};

function UtilBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
        <span className="uppercase tracking-widest">{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <Progress value={pct}>
        <ProgressTrack>
          <ProgressIndicator
            className={cn(pct >= 85 ? "bg-security-5" : pct >= 70 ? "bg-security-3" : "bg-primary")}
          />
        </ProgressTrack>
      </Progress>
    </div>
  );
}

/**
 * OPS_CONSOLE.md §3.7 — 리소스 대시보드: 노드별 GPU/CPU/RAM 사용 현황 + 상태 LED.
 */
export function ResourceNodes() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {MOCK_INFRA.nodes.map((node) => (
        <Card key={node.id} className="gap-3">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="font-mono text-sm">{node.name}</CardTitle>
              <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                <span className={cn("size-1.5 rounded-full", STATUS_DOT[node.status])} aria-hidden />
                {STATUS_LABEL[node.status]}
              </span>
            </div>
            <CardDescription className="font-mono text-[11px]">GPU {node.gpu}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {node.gpu !== "-" && (
              <>
                <UtilBar label="GPU" value={node.gpuUtil} />
                <UtilBar label="VRAM" value={node.vramUtil} />
              </>
            )}
            <UtilBar label="CPU" value={node.cpuUtil} />
            <UtilBar label="RAM" value={node.ramUtil} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
