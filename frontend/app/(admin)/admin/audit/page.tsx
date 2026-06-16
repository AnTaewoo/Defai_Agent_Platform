import { AuditStream } from "@/components/admin/audit-stream";
import { fullAuditLog } from "@/lib/api/admin-mock";

/**
 * OPS_CONSOLE.md §3.6 — 감사 · alert. 실시간 스트림 + 일시정지 + 강조 규칙.
 */
export default function AdminAuditPage() {
  const entries = fullAuditLog();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold tracking-wide text-foreground">
          감사 · alert
        </h1>
        <p className="text-sm text-muted-foreground">
          user 행동·접속 이벤트 실시간 스트림입니다.{" "}
          <span className="text-security-5">빨강</span>은 클리어런스 초과·권한 거부·이상 로그인,{" "}
          <span className="text-security-3">앰버</span>는 cloud 전환·클리어런스 변경(특히 L5
          승격)을 의미합니다.
        </p>
      </div>

      <AuditStream initialEntries={entries} />
    </div>
  );
}
