import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MOCK_INFRA } from "@/lib/api/mock";

type ServiceStatus = (typeof MOCK_INFRA.services)[number]["status"] | "red";

const STATUS_DOT: Record<ServiceStatus, string> = {
  green: "bg-security-1",
  yellow: "bg-security-3",
  red: "bg-security-5",
};

const STATUS_LABEL: Record<ServiceStatus, string> = {
  green: "정상",
  yellow: "주의",
  red: "오프라인",
};

interface ServiceTilesProps {
  /** true면 한 줄 요약 스트립(개요), false면 상세 타일 그리드(인프라). */
  compact?: boolean;
  className?: string;
}

/**
 * OPS_CONSOLE.md §3.1 서비스 상태 스트립 / §3.7 서비스 상태 타일.
 * OpenSearch · PostgreSQL · Airflow · MinIO · Sandbox Egress.
 * 상태 LED는 green/amber/red 기능색(security-1/3/5)만 절제 사용.
 */
export function ServiceTiles({ compact = false, className }: ServiceTilesProps) {
  if (compact) {
    return (
      <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-2", className)}>
        {MOCK_INFRA.services.map((svc) => (
          <div key={svc.id} className="flex items-center gap-2">
            <span className={cn("size-1.5 rounded-full", STATUS_DOT[svc.status])} aria-hidden />
            <span className="text-sm text-foreground">{svc.name}</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {STATUS_LABEL[svc.status]}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5", className)}>
      {MOCK_INFRA.services.map((svc) => (
        <Card key={svc.id} className="gap-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">{svc.name}</CardTitle>
              <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                <span className={cn("size-1.5 rounded-full", STATUS_DOT[svc.status])} aria-hidden />
                {STATUS_LABEL[svc.status]}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">{svc.detail}</CardContent>
        </Card>
      ))}
    </div>
  );
}
