"use client";

import { Separator } from "@/components/ui/separator";
import { ResourceModels } from "@/components/admin/resource-models";
import { ResourceNodes } from "@/components/admin/resource-nodes";
import { ServiceTiles } from "@/components/admin/service-tiles";

/**
 * OPS_CONSOLE.md §3.7 — 인프라 · 리소스. 서비스 상태 타일 + 노드 요약 + 모델 서빙 등급 관리.
 */
export default function AdminInfraPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold tracking-wide text-foreground">
          인프라 · 리소스
        </h1>
        <p className="text-sm text-muted-foreground">
          온프레미스 스택 운영 상태를 감시합니다. 모델 서빙 등급은 여기서 변경할 수 있습니다.
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
