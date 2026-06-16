/**
 * backend/src/types.py + backend/src/api/schemas.py 미러.
 * 도메인 타입(Pydantic *Out과 1:1). 단일 출처는 백엔드 — 변경 시 함께 갱신.
 */

export type SecurityLevel = 1 | 2 | 3 | 4 | 5;

export type Visibility = "shared" | "private";

/** docs/projects-rbac.md §3 — 누적: project_admin > manager > editor > member > viewer */
export type ProjectRole =
  | "viewer"
  | "member"
  | "editor"
  | "manager"
  | "project_admin";

export type LlmSourceMode = "on-prem" | "cloud";

export interface Principal {
  user_id: string;
  level: SecurityLevel;
}

export interface ProjectMembership {
  project_id: string;
  role: ProjectRole;
}

export interface SessionContext {
  session_id: string;
  principal: Principal;
  membership: ProjectMembership;
  active_agent_id: string | null;
}

/** GET /data, GET /projects/{id}/data → DataItemOut */
export interface DataItemOut {
  id: string;
  owner_id: string;
  security_level: SecurityLevel;
  visibility: Visibility;
  doc_type: string;
  index_status: string;
  dept?: string;
  filename?: string;
  chunk_count?: number;
  attached_project_count?: number;
}

/** 검색 결과 1청크 → ChunkOut */
export interface ChunkOut {
  text: string;
  summary: string;
  security_level: SecurityLevel;
  source: string;
  doc_type: string;
}

/** 워크플로우/생성 결과 → ArtifactOut */
export interface ArtifactOut {
  kind: "document" | "code" | "answer";
  security_level: SecurityLevel;
  source_ids: string[];
  path: string | null;
  content: string | null;
  chunks_used: ChunkOut[];
}

export interface ChatRequest {
  query: string;
  data_ids: string[];
  agent_id: string | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  my_role: ProjectRole;
  member_count: number;
  attached_data_count: number;
  max_security_level: SecurityLevel;
}

export interface AgentOut {
  id: string;
  name: string;
  description: string;
  security_level: SecurityLevel;
  visibility: Visibility;
  owner_id: string;
  status: "idle" | "searching" | "busy";
}

export interface UserOut {
  id: string;
  name: string;
  dept: string;
  level: SecurityLevel;
  project_count: number;
  last_seen_at: string | null;
  is_initial_admin?: boolean;
}

export interface MemberOut {
  user_id: string;
  role: ProjectRole;
  level: SecurityLevel;
}

/** GET /auth/users · GET /users/me */
export interface UserPublicOut {
  id: string;
  name: string;
  level: SecurityLevel;
  dept: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  user_id: string;
  action: string;
  detail: string;
  severity: "info" | "warn" | "crit";
}

export interface AdminUserOut {
  id: string;
  name: string;
  level: SecurityLevel;
  dept: string;
  project_count: number;
  is_initial_admin: boolean;
}

export interface AdminAgentOut {
  id: string;
  name: string;
  security_level: SecurityLevel;
  project_id: string | null;
  project_name: string;
}

export interface LlmEndpointOut {
  id: string;
  base_url: string;
  model: string;
  max_security_level: SecurityLevel;
  source: string;
}

export interface LlmSourceStatus {
  mode: LlmSourceMode;
  provider: string;
  changed_at: string | null;
  changed_by: string | null;
}
