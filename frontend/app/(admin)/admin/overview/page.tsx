import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SecurityBadge } from "@/components/security/security-badge";
import { GlobalKpi } from "@/components/admin/global-kpi";
import { LlmSourcePanel } from "@/components/admin/llm-source-panel";
import { ServiceTiles } from "@/components/admin/service-tiles";
import { adminAgentRows, adminDataRows, fullAuditLog } from "@/lib/api/admin-mock";
import { MOCK_LLM_SOURCE, MOCK_MEMBERSHIPS, MOCK_USERS } from "@/lib/api/mock";
import { cn } from "@/lib/utils";

const ACTION_LABEL: Record<string, string> = {
  login: "로그인",
  logout: "로그아웃",
  search: "검색",
  agent_call: "에이전트 호출",
  upload: "업로드",
  level_change: "클리어런스 변경",
  data_level_change: "데이터 등급 변경",
  agent_level_change: "에이전트 등급 변경",
  access_denied: "권한 거부",
  llm_source_change: "LLM 소스 전환",
};

const SEVERITY_DOT: Record<"info" | "warn" | "crit", string> = {
  info: "bg-muted-foreground",
  warn: "bg-security-3",
  crit: "bg-security-5",
};

/**
 * OPS_CONSOLE.md §3.1 — 관리 개요.
 * 전역 KPI + LLM 소스 상태 히어로(시그니처) + 최근 alert 패널 + 서비스 상태 스트립.
 */
export default function AdminOverviewPage() {
  const projectIds = new Set(MOCK_MEMBERSHIPS.map((m) => m.project_id));
  const dataRows = adminDataRows();
  const agentRows = adminAgentRows();
  const activeAgents = agentRows.filter((a) => a.status !== "idle").length;
  const recentAlerts = fullAuditLog().slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold tracking-wide text-foreground">
          관리 개요
        </h1>
        <p className="text-sm text-muted-foreground">
          시스템 전역 현황입니다. L5 클리어런스(admin)만 접근합니다.
        </p>
      </div>

      <GlobalKpi
        items={[
          { label: "전체 user", value: MOCK_USERS.length },
          { label: "전체 프로젝트", value: projectIds.size },
          {
            label: "색인 데이터",
            value: dataRows.length,
            hint: `공용 ${dataRows.filter((d) => d.visibility === "shared").length} · 개인 ${
              dataRows.filter((d) => d.visibility === "private").length
            }`,
          },
          {
            label: "활성 에이전트",
            value: activeAgents,
            hint: `전체 ${agentRows.length}개 중`,
          },
        ]}
      />

      <LlmSourcePanel source={MOCK_LLM_SOURCE} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="p-0">
          <CardHeader className="border-b border-border [.border-b]:pb-4">
            <CardTitle className="text-sm">최근 alert</CardTitle>
            <CardDescription>
              클리어런스 초과 요청 · 신규 로그인 · 등급/클리어런스 변경 · cloud 전환 등
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            <ul className="divide-y divide-border">
              {recentAlerts.map((a) => {
                const user = MOCK_USERS.find((u) => u.id === a.user_id);
                return (
                  <li key={a.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                    <span
                      className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", SEVERITY_DOT[a.severity])}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">
                          {user?.name ?? a.user_id} · {ACTION_LABEL[a.action] ?? a.action}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                          {new Date(a.at).toLocaleString("ko-KR")}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{a.detail}</p>
                    </div>
                    {user && (
                      <SecurityBadge level={user.level} visibility="shared" className="shrink-0" />
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardHeader className="border-b border-border [.border-b]:pb-4">
            <CardTitle className="text-sm">서비스 상태</CardTitle>
            <CardDescription>상세는 인프라 · 리소스 탭에서 확인하세요.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ServiceTiles compact />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
