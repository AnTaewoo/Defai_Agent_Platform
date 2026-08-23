/**
 * P9 관리자 콘솔(OPS_CONSOLE.md) 전용 목 데이터 확장.
 * lib/api/mock.ts는 import-only — 이 파일에서 그 export를 확장만 한다.
 * 실제 백엔드 연결 전까지 admin write 액션(클리어런스/등급 변경, LLM 소스 토글)은
 * 각 페이지의 로컬 state로 시뮬레이션하고, 이 파일은 "초기 화면을 채우는" 데이터만 제공한다.
 */
import {
  MOCK_AGENTS,
  MOCK_AUDIT_LOG,
  MOCK_DATA,
  MOCK_DATA_SOURCE,
  MOCK_PROJECT,
  MOCK_PROJECT_DATA,
  MOCK_USERS,
  SECURITY_LEVEL_NAMES,
} from "./mock";
import type { AuditEntry, SecurityLevel } from "./types";

/** user Sheet 타임라인 이벤트 종류 — OPS_CONSOLE.md §3.2 */
export type UserActivityKind =
  | "login"
  | "logout"
  | "upload"
  | "agent_join"
  | "access_denied"
  | "level_change";

export interface UserActivityEntry {
  id: string;
  at: string;
  kind: UserActivityKind;
  detail: string;
}

export const USER_ACTIVITY_LABEL: Record<UserActivityKind, string> = {
  login: "로그인",
  logout: "로그아웃",
  upload: "업로드",
  agent_join: "에이전트 편입",
  access_denied: "권한 초과 시도",
  level_change: "클리어런스 변경",
};

/** user_id -> 최근 행동 타임라인(최신순). admin/users 행 클릭 시 Sheet에서 사용. */
export const MOCK_USER_ACTIVITY: Record<string, UserActivityEntry[]> = {
  "u-l1": [
    { id: "ua-1-1", at: "2026-06-15T08:12:00+09:00", kind: "login", detail: "SSO 로그인 성공 · 172.16.10.21" },
    { id: "ua-1-2", at: "2026-06-14T17:42:00+09:00", kind: "access_denied", detail: "data-3(L5/private) 열람 시도 거부" },
    { id: "ua-1-3", at: "2026-06-12T09:30:00+09:00", kind: "upload", detail: "공개자료_2026Q2.pdf 업로드 (L1/공개)" },
    { id: "ua-1-4", at: "2026-06-10T09:00:00+09:00", kind: "login", detail: "SSO 로그인 성공 · 172.16.10.21" },
  ],
  "u-l2": [
    { id: "ua-2-1", at: "2026-06-15T08:30:00+09:00", kind: "login", detail: "SSO 로그인 성공 · 172.16.10.34" },
    { id: "ua-2-2", at: "2026-06-13T14:05:00+09:00", kind: "agent_join", detail: "기본 에이전트(L5) 편입" },
    { id: "ua-2-3", at: "2026-06-11T11:20:00+09:00", kind: "upload", detail: "internal-memo.xlsx 업로드 (L2/대내)" },
    { id: "ua-2-4", at: "2026-06-08T08:45:00+09:00", kind: "login", detail: "SSO 로그인 성공 · 172.16.10.34" },
  ],
  "u-l3": [
    { id: "ua-3-1", at: "2026-06-15T08:05:00+09:00", kind: "login", detail: "SSO 로그인 성공 · 172.16.11.05" },
    { id: "ua-3-2", at: "2026-06-15T08:06:00+09:00", kind: "agent_join", detail: "proj-default 내 검색 (data-1, data-2)" },
    { id: "ua-3-3", at: "2026-06-09T16:50:00+09:00", kind: "upload", detail: "internal.xlsx 업로드 (L3/민감)" },
    { id: "ua-3-4", at: "2026-06-05T13:10:00+09:00", kind: "access_denied", detail: "data-3(L5/private) 열람 시도 거부" },
  ],
  "u-l4": [
    { id: "ua-4-1", at: "2026-06-14T16:10:00+09:00", kind: "level_change", detail: "클리어런스 L3 → L4 변경 (by u-l5)" },
    { id: "ua-4-2", at: "2026-06-14T09:15:00+09:00", kind: "login", detail: "SSO 로그인 성공 · 172.16.11.40" },
    { id: "ua-4-3", at: "2026-06-07T10:00:00+09:00", kind: "agent_join", detail: "기본 에이전트(L5) 편입" },
    { id: "ua-4-4", at: "2026-06-02T09:00:00+09:00", kind: "login", detail: "SSO 로그인 성공 · 172.16.11.40" },
  ],
  "u-l5": [
    { id: "ua-5-1", at: "2026-06-15T07:50:00+09:00", kind: "login", detail: "SSO 로그인 성공 · 172.16.0.2 (admin)" },
    { id: "ua-5-2", at: "2026-06-13T11:00:00+09:00", kind: "level_change", detail: "LLM 소스 cloud → on-prem 전환" },
    { id: "ua-5-3", at: "2026-06-10T14:00:00+09:00", kind: "level_change", detail: "LLM 소스 on-prem 확인 · provider 갱신" },
    { id: "ua-5-4", at: "2026-06-01T09:00:00+09:00", kind: "login", detail: "SSO 로그인 성공 · 172.16.0.2 (admin) — 초기 admin 부트스트랩" },
  ],
};

/** 최근 alert 패널(개요) + 감사 스트림(§3.6)에 쓰일 추가 이벤트. MOCK_AUDIT_LOG와 합쳐 시간 역순으로 노출. */
export const ADMIN_EXTRA_AUDIT_LOG: AuditEntry[] = [
  {
    id: "a-6",
    at: "2026-06-15T08:55:00+09:00",
    user_id: "u-l1",
    action: "login",
    detail: "SSO 로그인 성공 · 신규 단말 172.16.10.99",
    severity: "warn",
  },
  {
    id: "a-7",
    at: "2026-06-15T08:40:00+09:00",
    user_id: "u-l3",
    action: "agent_call",
    detail: "기본 에이전트 호출 · proj-default",
    severity: "info",
  },
  {
    id: "a-8",
    at: "2026-06-15T08:36:00+09:00",
    user_id: "u-l2",
    action: "upload",
    detail: "internal-memo.xlsx 업로드 (L2/대내)",
    severity: "info",
  },
  {
    id: "a-9",
    at: "2026-06-14T22:14:00+09:00",
    user_id: "u-l1",
    action: "access_denied",
    detail: "agent-default 호출 시도 거부 — 클리어런스(L1) < 요구(L5)",
    severity: "crit",
  },
  {
    id: "a-10",
    at: "2026-06-14T21:02:00+09:00",
    user_id: "u-l4",
    action: "login",
    detail: "이상 로그인 패턴 감지 · 172.203.55.18 (해외 IP)",
    severity: "crit",
  },
];

/** 감사 스트림 전체(시간 역순) — MOCK_AUDIT_LOG + ADMIN_EXTRA_AUDIT_LOG 병합. */
export function fullAuditLog(): AuditEntry[] {
  return [...MOCK_AUDIT_LOG, ...ADMIN_EXTRA_AUDIT_LOG].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}

/** /admin/data — 데이터 행에 소유자 이름 등을 합쳐 보여주기 위한 뷰모델. */
export interface AdminDataRow {
  id: string;
  source: string;
  ownerId: string;
  ownerName: string;
  dept: string;
  securityLevel: SecurityLevel;
  visibility: "shared" | "private";
  indexStatus: string;
  uploadedAt: string;
  attachedProjectCount: number;
}

/** data-* 업로드 시각(목). MOCK_DATA에는 시각 필드가 없어 admin 화면용으로 보강. */
const DATA_UPLOADED_AT: Record<string, string> = {
  "data-1": "2026-06-01T09:00:00+09:00",
  "data-2": "2026-06-02T10:00:00+09:00",
  "data-3": "2026-06-03T11:00:00+09:00",
};

export function adminDataRows(): AdminDataRow[] {
  return MOCK_DATA.map((d) => {
    const owner = MOCK_USERS.find((u) => u.id === d.owner_id);
    return {
      id: d.id,
      source: MOCK_DATA_SOURCE[d.id] ?? d.id,
      ownerId: d.owner_id,
      ownerName: owner?.name ?? d.owner_id,
      dept: d.dept ?? "-",
      securityLevel: d.security_level,
      visibility: d.visibility,
      indexStatus: d.index_status,
      uploadedAt: DATA_UPLOADED_AT[d.id] ?? "-",
      attachedProjectCount:
        d.attached_project_count ??
        MOCK_PROJECT_DATA.filter((pd) => pd.data_id === d.id).length,
    };
  });
}

/**
 * /admin/agents — 시드 데이터(MOCK_AGENTS)에는 공용 기본 에이전트 1개뿐이라
 * "전 user 에이전트(공용+private)" 테이블을 보여주기 위해 admin 화면용 에이전트를 보강한다.
 * MOCK_PROJECT(proj-default)는 전 시드 유저가 멤버이므로 project_id는 동일하게 둔다.
 */
export interface AdminAgentRow {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  projectName: string;
  securityLevel: SecurityLevel;
  visibility: "shared" | "private";
  status: "idle" | "searching" | "busy";
}

const ADMIN_EXTRA_AGENTS: Omit<AdminAgentRow, "ownerName" | "projectName">[] = [
  {
    id: "agent-research-l3",
    name: "연구 보조 에이전트",
    description: "internal.xlsx 기반 분석. L3까지 가용.",
    ownerId: "u-l3",
    securityLevel: 3,
    visibility: "shared",
    status: "idle",
  },
  {
    id: "agent-ops-private",
    name: "운영 비공개 에이전트",
    description: "confidential.pdf 전용 — 소유자/관리자만.",
    ownerId: "u-l5",
    securityLevel: 5,
    visibility: "private",
    status: "busy",
  },
  {
    id: "agent-planning-l2",
    name: "기획 메모 에이전트",
    description: "internal-memo.xlsx 기반 요약. L2까지 가용.",
    ownerId: "u-l2",
    securityLevel: 2,
    visibility: "shared",
    status: "searching",
  },
  {
    id: "agent-personal-l1",
    name: "개인 초안 에이전트",
    description: "공개자료 초안 작성용 개인 에이전트.",
    ownerId: "u-l1",
    securityLevel: 1,
    visibility: "private",
    status: "idle",
  },
];

export function adminAgentRows(): AdminAgentRow[] {
  const base: Omit<AdminAgentRow, "ownerName" | "projectName">[] = MOCK_AGENTS.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    ownerId: a.owner_id,
    securityLevel: a.security_level,
    visibility: a.visibility,
    status: a.status,
  }));

  return [...base, ...ADMIN_EXTRA_AGENTS].map((a) => {
    const owner = MOCK_USERS.find((u) => u.id === a.ownerId);
    return {
      ...a,
      ownerName: owner?.name ?? a.ownerId,
      projectName: MOCK_PROJECT.name,
    };
  });
}

export { SECURITY_LEVEL_NAMES };
