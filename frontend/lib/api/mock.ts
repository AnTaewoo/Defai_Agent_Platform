/**
 * 프론트엔드 단독 구동용 목 데이터.
 * backend/src/projects/_db.py의 seed_dummy_project()와 동일한 더미 데이터(proj-default,
 * u-l1~u-l5, data-1~3, agent-default, ep-onprem)를 거울처럼 맞춘다.
 * Phase 4에서 lib/api/client.ts가 실제 FastAPI를 호출하게 되면 이 파일은 스토리북/개발 fallback으로 남긴다.
 */
import type {
  AgentOut,
  AuditEntry,
  DataItemOut,
  LlmSourceStatus,
  Principal,
  ProjectMembership,
  ProjectRole,
  ProjectSummary,
  SecurityLevel,
  SessionContext,
  UserOut,
} from "./types";

export const SECURITY_LEVEL_NAMES: Record<SecurityLevel, string> = {
  1: "공개",
  2: "대내",
  3: "민감",
  4: "비밀",
  5: "기밀",
};

export const DUMMY_PROJECT_ID = "proj-default";
export const DUMMY_AGENT_ID = "agent-default";
export const DUMMY_ENDPOINT_ID = "ep-onprem";

/** 로그인 화면에서 고를 수 있는 시드 계정. 클리어런스별 화면 차이를 그대로 보여준다. */
export const MOCK_ACCOUNTS: {
  id: string;
  name: string;
  dept: string;
  level: SecurityLevel;
  role: ProjectRole;
  sso_subject: string;
}[] = [
  { id: "u-l1", name: "김민준", dept: "기획", level: 1, role: "viewer", sso_subject: "sso-u-l1" },
  { id: "u-l2", name: "이서연", dept: "기획", level: 2, role: "member", sso_subject: "sso-u-l2" },
  { id: "u-l3", name: "박지훈", dept: "연구", level: 3, role: "editor", sso_subject: "sso-u-l3" },
  { id: "u-l4", name: "최유나", dept: "연구", level: 4, role: "manager", sso_subject: "sso-u-l4" },
  {
    id: "u-l5",
    name: "정도현",
    dept: "운영",
    level: 5,
    role: "project_admin",
    sso_subject: "sso-u-l5",
  },
];

export const DEFAULT_MOCK_USER_ID = "u-l2";

export const MOCK_USERS: UserOut[] = MOCK_ACCOUNTS.map((a) => ({
  id: a.id,
  name: a.name,
  dept: a.dept,
  level: a.level,
  project_count: 1,
  last_seen_at: "2026-06-15T08:30:00+09:00",
  is_initial_admin: a.id === "u-l5",
}));

export const MOCK_PROJECT: { id: string; name: string; description: string } = {
  id: DUMMY_PROJECT_ID,
  name: "Default Project",
  description: "MVP 단일 더미 프로젝트 — 전 시드 유저가 멤버로 참여.",
};

export const MOCK_MEMBERSHIPS: (ProjectMembership & { user_id: string })[] =
  MOCK_ACCOUNTS.map((a) => ({
    project_id: DUMMY_PROJECT_ID,
    role: a.role,
    user_id: a.id,
  }));

/** 라이브러리 데이터(프로젝트 독립). project_id 없음 — project_data로만 연결. */
export const MOCK_DATA: DataItemOut[] = [
  {
    id: "data-1",
    owner_id: "u-l1",
    security_level: 1,
    visibility: "shared",
    doc_type: "pdf",
    index_status: "indexed",
    dept: "기획",
    chunk_count: 12,
    attached_project_count: 1,
  },
  {
    id: "data-2",
    owner_id: "u-l3",
    security_level: 3,
    visibility: "shared",
    doc_type: "xlsx",
    index_status: "indexed",
    dept: "연구",
    chunk_count: 34,
    attached_project_count: 1,
  },
  {
    id: "data-3",
    owner_id: "u-l5",
    security_level: 5,
    visibility: "private",
    doc_type: "pdf",
    index_status: "indexed",
    dept: "운영",
    chunk_count: 8,
    attached_project_count: 1,
  },
];

/** 출처 파일명(citation/Data Sheet 표시용). source는 OpenSearch meta.source. */
export const MOCK_DATA_SOURCE: Record<string, string> = {
  "data-1": "docs/sample/public.pdf",
  "data-2": "docs/sample/internal.xlsx",
  "data-3": "docs/sample/confidential.pdf",
};

/** project_data N:M 연결 — 게이트①(attached_source_ids)의 원천. */
export const MOCK_PROJECT_DATA: { project_id: string; data_id: string; attached_at: string }[] = [
  { project_id: DUMMY_PROJECT_ID, data_id: "data-1", attached_at: "2026-06-01T09:00:00+09:00" },
  { project_id: DUMMY_PROJECT_ID, data_id: "data-2", attached_at: "2026-06-02T10:00:00+09:00" },
  { project_id: DUMMY_PROJECT_ID, data_id: "data-3", attached_at: "2026-06-03T11:00:00+09:00" },
];

export const MOCK_AGENTS: AgentOut[] = [
  {
    id: DUMMY_AGENT_ID,
    name: "기본 에이전트",
    description: "Qwen2.5-7B-Instruct(on-prem) 서빙. L5까지 가용.",
    security_level: 5,
    visibility: "shared",
    owner_id: "u-l5",
    status: "idle",
  },
];

export const MOCK_LLM_ENDPOINTS = [
  {
    id: DUMMY_ENDPOINT_ID,
    base_url: "http://vllm-internal:8000/v1",
    model: "Qwen/Qwen2.5-7B-Instruct",
    max_security_level: 5 as SecurityLevel,
    source: "on-prem" as const,
  },
];

export const MOCK_LLM_SOURCE: LlmSourceStatus = {
  mode: "on-prem",
  provider: "vLLM (Qwen2.5-7B-Instruct, on-prem)",
  changed_at: "2026-06-10T14:00:00+09:00",
  changed_by: "u-l5",
};

export const MOCK_AUDIT_LOG: AuditEntry[] = [
  {
    id: "a-1",
    at: "2026-06-15T08:30:00+09:00",
    user_id: "u-l2",
    action: "login",
    detail: "SSO 로그인 성공",
    severity: "info",
  },
  {
    id: "a-2",
    at: "2026-06-15T08:05:00+09:00",
    user_id: "u-l3",
    action: "search",
    detail: "proj-default 내 검색 (data-1, data-2)",
    severity: "info",
  },
  {
    id: "a-3",
    at: "2026-06-14T17:42:00+09:00",
    user_id: "u-l1",
    action: "access_denied",
    detail: "data-3(L5/private) 열람 시도 거부",
    severity: "crit",
  },
  {
    id: "a-4",
    at: "2026-06-14T16:10:00+09:00",
    user_id: "u-l5",
    action: "level_change",
    detail: "u-l4 클리어런스 L3 → L4 변경",
    severity: "warn",
  },
  {
    id: "a-5",
    at: "2026-06-13T11:00:00+09:00",
    user_id: "u-l5",
    action: "llm_source_change",
    detail: "LLM 소스 cloud → on-prem 전환",
    severity: "warn",
  },
];

/** /admin/infra — 읽기전용 서비스/리소스 모니터링 목 데이터. */
export const MOCK_INFRA = {
  services: [
    { id: "opensearch", name: "OpenSearch", status: "green" as const, detail: "노드 3 · 샤드 12 · 색인 지연 0.4s" },
    { id: "postgres", name: "PostgreSQL", status: "green" as const, detail: "연결 18 · 복제 지연 0ms" },
    { id: "airflow", name: "Airflow", status: "yellow" as const, detail: "색인 DAG 성공률 92% · 실행중 1" },
    { id: "minio", name: "MinIO", status: "green" as const, detail: "사용 42.3GB / 500GB" },
    { id: "sandbox", name: "Sandbox Egress", status: "green" as const, detail: "net=none · 차단 시도 0" },
  ],
  nodes: [
    { id: "node-a", name: "gpu-node-a", status: "active" as const, gpu: "A100 80GB x1", gpuUtil: 0.42, vramUtil: 0.58, cpuUtil: 0.31, ramUtil: 0.47 },
    { id: "node-b", name: "gpu-node-b", status: "active" as const, gpu: "A100 80GB x1", gpuUtil: 0.18, vramUtil: 0.33, cpuUtil: 0.22, ramUtil: 0.39 },
    { id: "node-c", name: "cpu-node-a", status: "congested" as const, gpu: "-", gpuUtil: 0, vramUtil: 0, cpuUtil: 0.88, ramUtil: 0.76 },
  ],
  models: [
    {
      id: "ep-onprem",
      model: "Qwen/Qwen2.5-7B-Instruct",
      engine: "vLLM",
      node: "gpu-node-a",
      maxSecurityLevel: 5 as SecurityLevel,
      queue: 2,
      status: "serving" as const,
    },
    {
      id: "ep-embed",
      model: "ML Commons local embedding",
      engine: "OpenSearch ML Commons",
      node: "gpu-node-b",
      maxSecurityLevel: 5 as SecurityLevel,
      queue: 0,
      status: "serving" as const,
    },
  ],
};

function principalOf(userId: string): Principal {
  const account = MOCK_ACCOUNTS.find((a) => a.id === userId);
  if (!account) throw new Error(`unknown mock user: ${userId}`);
  return { user_id: account.id, level: account.level };
}

function membershipOf(userId: string): ProjectMembership {
  const m = MOCK_MEMBERSHIPS.find((m) => m.user_id === userId);
  if (!m) throw new Error(`mock user ${userId} has no project membership`);
  return { project_id: m.project_id, role: m.role };
}

/** 프론트 단독 구동(목)용 SessionContext 빌더. 실제로는 sessions.open_session()이 만든다. */
export function mockSessionContext(
  userId: string,
  activeAgentId: string | null = DUMMY_AGENT_ID,
): SessionContext {
  return {
    session_id: `mock-session-${userId}`,
    principal: principalOf(userId),
    membership: membershipOf(userId),
    active_agent_id: activeAgentId,
  };
}

/** 게이트①+②+③ 적용 후 ctx가 볼 수 있는 프로젝트 연결 데이터. */
export function visibleProjectData(ctx: SessionContext): DataItemOut[] {
  const attached = new Set(
    MOCK_PROJECT_DATA.filter((pd) => pd.project_id === ctx.membership.project_id).map(
      (pd) => pd.data_id,
    ),
  );
  return MOCK_DATA.filter(
    (d) =>
      attached.has(d.id) &&
      d.security_level <= ctx.principal.level &&
      (d.visibility === "shared" || d.owner_id === ctx.principal.user_id),
  );
}

/** 클리어런스로 필터된, 본인이 속한 프로젝트의 에이전트 목록(게이트③). */
export function visibleAgents(ctx: SessionContext): AgentOut[] {
  return MOCK_AGENTS.filter(
    (a) =>
      a.security_level <= ctx.principal.level &&
      (a.visibility === "shared" || a.owner_id === ctx.principal.user_id),
  );
}

/** 내 라이브러리 + 접근 가능한 공용 데이터 (GET /data). */
export function libraryData(ctx: SessionContext): DataItemOut[] {
  return MOCK_DATA.filter(
    (d) =>
      d.security_level <= ctx.principal.level &&
      (d.visibility === "shared" || d.owner_id === ctx.principal.user_id),
  );
}

export function myProjects(ctx: SessionContext): ProjectSummary[] {
  if (ctx.membership.project_id !== DUMMY_PROJECT_ID) return [];
  const attachedCount = MOCK_PROJECT_DATA.filter(
    (pd) => pd.project_id === DUMMY_PROJECT_ID,
  ).length;
  const maxLevel = Math.max(
    ...MOCK_DATA.filter((d) =>
      MOCK_PROJECT_DATA.some(
        (pd) => pd.project_id === DUMMY_PROJECT_ID && pd.data_id === d.id,
      ),
    ).map((d) => d.security_level),
  ) as SecurityLevel;
  return [
    {
      id: MOCK_PROJECT.id,
      name: MOCK_PROJECT.name,
      description: MOCK_PROJECT.description,
      my_role: ctx.membership.role,
      member_count: MOCK_MEMBERSHIPS.length,
      attached_data_count: attachedCount,
      max_security_level: maxLevel,
    },
  ];
}

export function userById(userId: string): UserOut | undefined {
  return MOCK_USERS.find((u) => u.id === userId);
}
