/**
 * 백엔드(FastAPI) 호출 클라이언트. MVP 인증은 `X-Session-Token`(시드 더미 토큰
 * "sso-<user_id>") + `X-Project-Id` 헤더로 SessionContext를 구성한다
 * (backend/src/api/main.py `_principal`/`_open_session` 참고).
 */
import type { AdminAgentOut, AdminUserOut, AgentOut, ArtifactOut, AuditEntry, ChatRequest, ChunkOut, DataItemOut, LlmEndpointOut, LlmSourceStatus, MemberOut, ProjectRole, ProjectSummary, SecurityLevel, SessionContext, UserPublicOut } from "@/lib/api/types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function authHeaders(ctx: SessionContext): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Session-Token": `sso-${ctx.principal.user_id}`,
    "X-Project-Id": ctx.membership.project_id,
  };
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.detail ? JSON.stringify(body.detail) : await res.text();
    throw new ApiError(res.status, detail || res.statusText);
  }
  return res.json();
}

/** POST /chat — 질의 1건 실행, 완결된 ArtifactOut을 반환(현재 비-스트리밍). */
export async function sendChatMessage(
  ctx: SessionContext,
  query: string,
  dataIds: string[],
  agentId: string | null,
): Promise<ArtifactOut> {
  const body: ChatRequest = { query, data_ids: dataIds, agent_id: agentId };
  const res = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: authHeaders(ctx),
    body: JSON.stringify(body),
  });
  return unwrap<ArtifactOut>(res);
}

/** POST /data — 파일 업로드 → 파싱→청킹→색인 파이프라인. multipart/form-data. */
export async function uploadData(
  ctx: SessionContext,
  file: File,
  securityLevel: number,
  visibility: string,
  dept: string,
): Promise<DataItemOut> {
  const form = new FormData();
  form.append("file", file);
  form.append("security_level", String(securityLevel));
  form.append("visibility", visibility);
  form.append("dept", dept);
  const res = await fetch(`${API_BASE_URL}/data`, {
    method: "POST",
    headers: {
      "X-Session-Token": `sso-${ctx.principal.user_id}`,
      "X-Project-Id": ctx.membership.project_id,
    },
    body: form,
  });
  return unwrap<DataItemOut>(res);
}

/** GET /data — 내 라이브러리 + 접근 가능한 공용 데이터 목록. */
export async function listLibraryData(ctx: SessionContext): Promise<DataItemOut[]> {
  const res = await fetch(`${API_BASE_URL}/data`, { headers: authHeaders(ctx) });
  return unwrap<DataItemOut[]>(res);
}

/** POST /projects/{id}/data — 라이브러리 데이터를 프로젝트에 연결(attach). */
export async function attachProjectData(
  ctx: SessionContext,
  projectId: string,
  dataIds: string[],
): Promise<DataItemOut[]> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/data`, {
    method: "POST",
    headers: authHeaders(ctx),
    body: JSON.stringify({ data_ids: dataIds }),
  });
  return unwrap<DataItemOut[]>(res);
}

/** GET /projects/{id}/data — 프로젝트에 연결된 데이터 목록(게이트①②③). */
export async function listProjectData(
  ctx: SessionContext,
  projectId: string,
): Promise<DataItemOut[]> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/data`, {
    headers: authHeaders(ctx),
  });
  return unwrap<DataItemOut[]>(res);
}

/** POST /projects — 프로젝트 생성. 생성자가 project_admin. */
export async function createProject(
  ctx: SessionContext,
  name: string,
  description: string,
  maxSecurityLevel: SecurityLevel,
): Promise<ProjectSummary> {
  const res = await fetch(`${API_BASE_URL}/projects`, {
    method: "POST",
    headers: authHeaders(ctx),
    body: JSON.stringify({ name, description, max_security_level: maxSecurityLevel }),
  });
  return unwrap<ProjectSummary>(res);
}

/** GET /projects — 내가 멤버인 프로젝트 목록. */
export async function listProjects(ctx: SessionContext): Promise<ProjectSummary[]> {
  const res = await fetch(`${API_BASE_URL}/projects`, { headers: authHeaders(ctx) });
  return unwrap<ProjectSummary[]>(res);
}

/** GET /projects/{id} — 프로젝트 단건 조회. */
export async function getProject(ctx: SessionContext, projectId: string): Promise<ProjectSummary> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}`, { headers: authHeaders(ctx) });
  return unwrap<ProjectSummary>(res);
}

/** GET /projects/{id}/members — 프로젝트 멤버 목록. */
export async function listProjectMembers(
  ctx: SessionContext,
  projectId: string,
): Promise<MemberOut[]> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/members`, {
    headers: authHeaders(ctx),
  });
  return unwrap<MemberOut[]>(res);
}

/** GET /data/{id}/chunks — 데이터 청크 미리보기(최대 20개, 게이트②③ 적용). */
export async function listDataChunks(
  ctx: SessionContext,
  dataId: string,
): Promise<ChunkOut[]> {
  const res = await fetch(`${API_BASE_URL}/data/${dataId}/chunks`, {
    headers: authHeaders(ctx),
  });
  return unwrap<ChunkOut[]>(res);
}

/** POST /auth/register — 신규 유저 등록(L1 고정). */
export async function registerUser(name: string, dept?: string): Promise<UserPublicOut> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, dept: dept ?? "" }),
  });
  return unwrap<UserPublicOut>(res);
}

/** GET /auth/users — 전체 유저 목록(로그인 화면용, MVP 인증 없음). */
export async function listUsers(): Promise<UserPublicOut[]> {
  const res = await fetch(`${API_BASE_URL}/auth/users`);
  return unwrap<UserPublicOut[]>(res);
}

/** GET /users/me — 현재 유저 프로필(session-context 부트스트랩). */
export async function getMe(userId: string): Promise<UserPublicOut> {
  const res = await fetch(`${API_BASE_URL}/users/me`, {
    headers: { "X-Session-Token": `sso-${userId}`, "X-Project-Id": "proj-default" },
  });
  return unwrap<UserPublicOut>(res);
}

/** GET /projects — userId로 직접 호출(session-context 부트스트랩). */
export async function fetchUserProjects(userId: string): Promise<ProjectSummary[]> {
  const res = await fetch(`${API_BASE_URL}/projects`, {
    headers: { "X-Session-Token": `sso-${userId}`, "X-Project-Id": "proj-default" },
  });
  if (!res.ok) return [];
  return res.json();
}

/** GET /projects/{id}/agents — 프로젝트 가용 에이전트(등급 자동 필터). */
export async function listProjectAgents(
  ctx: SessionContext,
  projectId: string,
): Promise<AgentOut[]> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/agents`, {
    headers: authHeaders(ctx),
  });
  return unwrap<AgentOut[]>(res);
}

/** POST /projects/{id}/members — 멤버 직접 추가(manager·project_admin). */
export async function addProjectMember(
  ctx: SessionContext,
  projectId: string,
  userId: string,
  role: ProjectRole,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/members`, {
    method: "POST",
    headers: authHeaders(ctx),
    body: JSON.stringify({ user_id: userId, role }),
  });
  await unwrap<unknown>(res);
}

/** GET /llm/source — 전역 LLM 소스(on-prem/cloud) 상태. */
export async function getLlmSource(ctx: SessionContext): Promise<LlmSourceStatus> {
  const res = await fetch(`${API_BASE_URL}/llm/source`, { headers: authHeaders(ctx) });
  return unwrap<LlmSourceStatus>(res);
}

/** GET /admin/audit — 전체 감사 로그(최신 200건). L5 필수. */
export async function getAdminAuditLog(ctx: SessionContext): Promise<AuditEntry[]> {
  const res = await fetch(`${API_BASE_URL}/admin/audit`, { headers: authHeaders(ctx) });
  return unwrap<AuditEntry[]>(res);
}

/** GET /admin/users — 전체 유저 + 프로젝트 수. L5 필수. */
export async function getAdminUsers(ctx: SessionContext): Promise<AdminUserOut[]> {
  const res = await fetch(`${API_BASE_URL}/admin/users`, { headers: authHeaders(ctx) });
  return unwrap<AdminUserOut[]>(res);
}

/** PATCH /admin/users/{id}/level — 유저 클리어런스 변경. L5 필수. */
export async function patchUserLevel(
  ctx: SessionContext,
  userId: string,
  level: SecurityLevel,
): Promise<AdminUserOut> {
  const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/level`, {
    method: "PATCH",
    headers: authHeaders(ctx),
    body: JSON.stringify({ level }),
  });
  return unwrap<AdminUserOut>(res);
}

/** PATCH /admin/data/{id}/level — 데이터 보안등급 변경. L5 필수. */
export async function patchDataLevel(
  ctx: SessionContext,
  dataId: string,
  level: SecurityLevel,
): Promise<DataItemOut> {
  const res = await fetch(`${API_BASE_URL}/admin/data/${dataId}/level`, {
    method: "PATCH",
    headers: authHeaders(ctx),
    body: JSON.stringify({ level }),
  });
  return unwrap<DataItemOut>(res);
}

/** DELETE /admin/data/{id} — 데이터 삭제(파일+청크+DB). L5 필수. */
export async function deleteAdminData(ctx: SessionContext, dataId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/admin/data/${dataId}`, {
    method: "DELETE",
    headers: authHeaders(ctx),
  });
  if (!res.ok) await unwrap<never>(res);
}

/** GET /admin/agents — 전체 에이전트(등급 필터 없음). L5 필수. */
export async function getAdminAgents(ctx: SessionContext): Promise<AdminAgentOut[]> {
  const res = await fetch(`${API_BASE_URL}/admin/agents`, { headers: authHeaders(ctx) });
  return unwrap<AdminAgentOut[]>(res);
}

/** PATCH /admin/agents/{id}/level — 에이전트 보안등급 변경. L5 필수. */
export async function patchAgentLevel(
  ctx: SessionContext,
  agentId: string,
  level: SecurityLevel,
): Promise<AdminAgentOut> {
  const res = await fetch(`${API_BASE_URL}/admin/agents/${agentId}/level`, {
    method: "PATCH",
    headers: authHeaders(ctx),
    body: JSON.stringify({ level }),
  });
  return unwrap<AdminAgentOut>(res);
}

/** GET /llm-endpoints — 내 클리어런스 이하 LLM 엔드포인트(에이전트 빌더용). */
export async function getLlmEndpoints(ctx: SessionContext): Promise<LlmEndpointOut[]> {
  const res = await fetch(`${API_BASE_URL}/llm-endpoints`, { headers: authHeaders(ctx) });
  return unwrap<LlmEndpointOut[]>(res);
}

/** POST /projects/{id}/agents — 에이전트 생성(project_admin). */
export async function createProjectAgent(
  ctx: SessionContext,
  projectId: string,
  name: string,
  description: string,
  endpointId: string,
  visibility: "shared" | "private",
): Promise<AgentOut> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/agents`, {
    method: "POST",
    headers: authHeaders(ctx),
    body: JSON.stringify({ name, description, endpoint_id: endpointId, visibility }),
  });
  return unwrap<AgentOut>(res);
}

/** GET /admin/llm-endpoints — 전체 LLM 엔드포인트. L5 필수. */
export async function getAdminLlmEndpoints(ctx: SessionContext): Promise<LlmEndpointOut[]> {
  const res = await fetch(`${API_BASE_URL}/admin/llm-endpoints`, { headers: authHeaders(ctx) });
  return unwrap<LlmEndpointOut[]>(res);
}

/** GET /data/{dataId}/chunks — 데이터 청크 목록(summary 포함). */
export async function getDataChunks(ctx: SessionContext, dataId: string): Promise<ChunkOut[]> {
  const res = await fetch(`${API_BASE_URL}/data/${dataId}/chunks`, { headers: authHeaders(ctx) });
  return unwrap<ChunkOut[]>(res);
}

/** PATCH /admin/llm-endpoints/{id}/level — 서빙 등급 변경. L5 필수. */
export async function patchLlmEndpointLevel(
  ctx: SessionContext,
  endpointId: string,
  level: SecurityLevel,
): Promise<LlmEndpointOut> {
  const res = await fetch(`${API_BASE_URL}/admin/llm-endpoints/${endpointId}/level`, {
    method: "PATCH",
    headers: authHeaders(ctx),
    body: JSON.stringify({ level }),
  });
  return unwrap<LlmEndpointOut>(res);
}
