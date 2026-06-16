"""api 경계 와이어 계약(DTO). 내부 도메인 dataclass(types.py)와 분리한다.

도메인 변경이 API 계약을 깨지 않도록, 라우터는 도메인 객체를 이 *Out 모델로 어댑트해 응답한다.
프론트(Next.js) TypeScript 타입은 이 스키마에서 OpenAPI로 생성해 단일 출처화한다.
"""
from __future__ import annotations

from pydantic import BaseModel

from ..types import Artifact, Chunk, DataItem


class ChunkOut(BaseModel):
    text: str
    summary: str = ""
    security_level: int
    source: str
    doc_type: str

    @classmethod
    def of(cls, c: Chunk) -> "ChunkOut":
        return cls(
            text=c.text,
            summary=c.summary,
            security_level=c.meta.security_level,
            source=c.meta.source,
            doc_type=c.meta.doc_type,
        )


class DataItemOut(BaseModel):
    id: str
    owner_id: str
    security_level: int
    visibility: str
    doc_type: str
    dept: str | None = None
    filename: str = ""
    index_status: str = "unknown"
    chunk_count: int = 0

    @classmethod
    def of(
        cls,
        d: DataItem,
        *,
        index_status: str = "unknown",
        chunk_count: int = 0,
    ) -> "DataItemOut":
        return cls(
            id=d.id,
            owner_id=d.owner_id,
            security_level=d.security_level,
            visibility=d.visibility,
            doc_type=d.doc_type,
            dept=d.dept or None,
            filename=d.filename,
            index_status=index_status,
            chunk_count=chunk_count,
        )


class ArtifactOut(BaseModel):
    kind: str
    security_level: int
    source_ids: list[str]
    path: str | None = None
    content: str | None = None
    chunks_used: list[ChunkOut] = []

    @classmethod
    def of(cls, a: Artifact) -> "ArtifactOut":
        return cls(
            kind=a.kind,
            security_level=a.security_level,
            source_ids=list(a.source_ids),
            path=a.path,
            content=a.content,
            chunks_used=[ChunkOut.of(c) for c in a.chunks_used],
        )


class ChatRequest(BaseModel):
    """챗 요청 와이어 모델. 신원/권한은 헤더·세션에서 SessionContext로 해석한다(여기에 담지 않음)."""
    query: str
    data_ids: list[str] = []        # 세션에 묶을 데이터(다중) — TODO: search()가 부분집합 필터를
                                     # 받도록 확장되면 api에서 주입(현재는 attached_source_ids 전체)
    agent_id: str | None = None     # 활성 에이전트(가용 목록 내)


class SessionCreateIn(BaseModel):
    project_id: str


class AgentSelectIn(BaseModel):
    agent_id: str


class AttachDataIn(BaseModel):
    """POST /projects/{id}/data — 라이브러리 데이터를 활성 프로젝트에 연결(attach_data)."""
    data_ids: list[str]


class SessionOut(BaseModel):
    session_id: str
    project_id: str
    role: str
    active_agent_id: str | None = None
    available_agents: list[str] = []


class ProjectCreateIn(BaseModel):
    name: str
    description: str = ""
    max_security_level: int = 1


class ProjectOut(BaseModel):
    id: str
    name: str
    description: str
    my_role: str
    member_count: int
    attached_data_count: int
    max_security_level: int


class MemberOut(BaseModel):
    user_id: str
    role: str
    level: int


class LlmSourceOut(BaseModel):
    """현재 LLM 소스(on-prem/cloud) — 프론트는 읽기 전용(절대원칙 6)."""
    mode: str
    provider: str


class RegisterIn(BaseModel):
    """POST /auth/register — 신규 유저 등록(L1 고정, SSO 미연동 MVP)."""
    name: str
    dept: str = ""


class UserPublicOut(BaseModel):
    """GET /auth/users·GET /users/me — 공개 유저 프로필."""
    id: str
    name: str
    level: int
    dept: str = ""


class AgentOut(BaseModel):
    """GET /projects/{id}/agents — 프로젝트 가용 에이전트."""
    id: str
    name: str
    description: str = ""
    security_level: int
    visibility: str = "shared"
    owner_id: str = ""
    status: str = "idle"


class MemberAddIn(BaseModel):
    """POST /projects/{id}/members — 멤버 직접 추가."""
    user_id: str
    role: str


class AgentCreateIn(BaseModel):
    """POST /projects/{id}/agents — 에이전트 생성."""
    name: str
    description: str = ""
    endpoint_id: str
    visibility: str = "shared"


class LevelPatchIn(BaseModel):
    """PATCH /admin/*/level — 등급·클리어런스 변경 요청."""
    level: int


class AuditEntryOut(BaseModel):
    """GET /admin/audit — audit_log 행(severity는 action에서 파생)."""
    id: str
    at: str
    user_id: str | None = None
    action: str
    detail: str
    severity: str


class AdminUserOut(BaseModel):
    """GET /admin/users — 유저 + 프로젝트 참여 수."""
    id: str
    name: str
    level: int
    dept: str = ""
    project_count: int = 0
    is_initial_admin: bool = False


class AdminAgentOut(BaseModel):
    """GET /admin/agents — 전체 에이전트(admin 전용)."""
    id: str
    name: str
    security_level: int
    project_id: str | None = None
    project_name: str = ""


class LlmEndpointOut(BaseModel):
    """GET /admin/llm-endpoints — llm_endpoints 행(admin 전용)."""
    id: str
    base_url: str
    model: str
    max_security_level: int
    source: str
