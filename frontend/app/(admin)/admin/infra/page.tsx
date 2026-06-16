import { Separator } from "@/components/ui/separator";
import { ResourceModels } from "@/components/admin/resource-models";
import { ResourceNodes } from "@/components/admin/resource-nodes";
import { ServiceTiles } from "@/components/admin/service-tiles";

/**
 * OPS_CONSOLE.md §3.7 — 인프라 · 리소스. 읽기전용 모니터링.
 * 서비스 상태 타일(OpenSearch/PostgreSQL/Airflow/MinIO/Sandbox Egress) +
 * 리소스 대시보드(노드 GPU/CPU/RAM · 모델↔노드↔local LLM 할당).
 */
export default function AdminInfraPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold tracking-wide text-foreground">
          인프라 · 리소스
        </h1>
        <p className="text-sm text-muted-foreground">
          온프레미스 스택 운영 상태를 감시합니다(읽기전용 — 제어는 인프라 레이어). 이상치(노드
          오프라인 · DAG 실패 · EGRESS 시도 · 클러스터 red)는 감사 스트림으로도 전파됩니다.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-sm font-medium text-foreground">서비스 상태</h2>
        <ServiceTiles />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="font-heading text-sm font-medium text-foreground">리소스 — 노드</h2>
        <ResourceNodes />
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-sm font-medium text-foreground">리소스 — 모델</h2>
        <ResourceModels />
      </section>
    </div>
  );
}
