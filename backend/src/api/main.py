"""FastAPI 진입점. 모듈 조립은 여기서만 한다.

조립 규칙(모듈 경계는 여기서만 넘는다 — docs/conventions.md):
  검색 1건 = projects.attached_source_ids(ctx) 로 프로젝트 연결 데이터 해소
           → search.search(query, ctx=ctx, attached_source_ids=ids) 에 주입.
           (워크플로우 경로는 tools._run_search가 동일 조립을 캡슐화해 재사용한다.)
  채팅/워크플로우 = sessions.require_live_agent(ctx) 로 활성 에이전트 실행시점 재검증(TOCTOU)
           → workflows.run_workflow(task, ctx=ctx).
  search/workflows는 projects/agents를 직접 import하지 않는다(격리 입력은 api가 전달).
  응답은 도메인 dataclass를 api.schemas의 *Out(Pydantic)으로 어댑트해 직렬화(타입 계약 고정).

인증: MVP는 SSO/LDAP 미연동 — `X-Session-Token` 헤더를 auth.principal_from_session으로
Principal로 변환한다(시드 더미 토큰 "sso-u-l1".."sso-u-l5"). 활성 프로젝트는 `X-Project-Id`
헤더(기본값 = 더미 프로젝트, ROADMAP의 "단일 더미 프로젝트로 MVP 가능" 전제)로 받아
sessions.open_session(principal, project_id)으로 SessionContext를 만든다.

업로드 1건 = POST /data가 parsing.parse(P1) → chunking.chunk_and_tag(P2, data_id=새 data.id를
meta.source로) → indexing.ensure_index()+index_chunks(P3) → _db.data insert까지 한 줄기로
조립한다. 프로젝트 연결은 POST /projects/{id}/data가 projects.can(ctx,"attach_data") 게이트 후
_db.project_data에 idempotent insert한다(게이트①의 입력을 늘릴 뿐, 검색측 ②③ 재필터는 그대로).

TODO: 채팅 SSE 스트리밍(현재 run_workflow는 동기/완결 Artifact만 반환),
어드민(에이전트 편입·클리어런스 변경·on-prem/cloud 토글) 라우터 연결.
"""
from __future__ import annotations

import uuid
from collections.abc import Sequence
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from .. import chunking, indexing, parsing, sessions, workflows
from ..agents import available_agents
from ..auth import principal_from_session
from ..projects import _db, attached_source_ids, can, membership_of
from ..types import DataItem, Principal, SessionContext
from .schemas import (
    AgentOut,
    AgentSelectIn,
    ArtifactOut,
    AttachDataIn,
    ChatRequest,
    ChunkOut,
    DataItemOut,
    LlmSourceOut,
    MemberAddIn,
    MemberOut,
    ProjectCreateIn,
    ProjectOut,
    RegisterIn,
    SessionCreateIn,
    SessionOut,
    UserPublicOut,
)

app = FastAPI(title="D.A.P")


@app.on_event("startup")
def _startup() -> None:
    """DB 스키마 보장 + 더미 시드(개발용). 운영은 Alembic 마이그레이션으로 교체."""
    _db.ensure_schema()
    _db.seed_dummy_project()


# 개발용 CORS: 프론트(Next dev, 기본 5720)에서 X-Session-Token/X-Project-Id 헤더로 직접 호출.
# 운영에서는 동일 오리진(리버스 프록시) 배포를 전제로 좁힌다.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https?://[\w.-]*\.antaewoo\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


# --- 인증/세션 조립 -----------------------------------------------------------------


def _principal(x_session_token: str = Header(..., alias="X-Session-Token")) -> Principal:
    """`X-Session-Token` -> Principal (auth.principal_from_session, P6)."""
    try:
        return principal_from_session(x_session_token)
    except PermissionError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


def _open_session(principal: Principal, project_id: str) -> SessionContext:
    """principal + project_id -> SessionContext (sessions.open_session, P13).

    비멤버/존재하지 않는 프로젝트는 동일하게 403으로 매핑한다(프로젝트 존재 여부 비노출).
    """
    try:
        return sessions.open_session(principal, project_id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


def _session_out(ctx: SessionContext) -> SessionOut:
    return SessionOut(
        session_id=ctx.session_id,
        project_id=ctx.membership.project_id,
        role=ctx.membership.role,
        active_agent_id=ctx.active_agent_id,
        available_agents=available_agents(ctx),
    )


# --- MVP 인증 엔드포인트 (SSO 미연동) -------------------------------------------------


@app.post("/auth/register", response_model=UserPublicOut, status_code=201)
def register_user(body: RegisterIn) -> UserPublicOut:
    """신규 유저 등록. 클리어런스 L1 고정(admin이 나중에 승격). 비밀번호 미적용 MVP."""
    user_id = f"u-{uuid.uuid4().hex[:12]}"
    sso_subject = f"sso-{user_id}"
    with _db.get_engine().begin() as conn:
        conn.execute(
            _db.users.insert().values(
                id=user_id,
                sso_subject=sso_subject,
                level=1,
                dept=body.dept,
                name=body.name,
            )
        )
    return UserPublicOut(id=user_id, name=body.name, level=1, dept=body.dept)


@app.get("/auth/users", response_model=list[UserPublicOut])
def list_users_public() -> list[UserPublicOut]:
    """로그인 화면용 전체 유저 목록(MVP: 인증 없음 — 실 SSO 연동 시 제거)."""
    with _db.get_engine().connect() as conn:
        rows = conn.execute(
            select(_db.users).order_by(_db.users.c.level, _db.users.c.id)
        ).all()
    return [
        UserPublicOut(
            id=r.id,
            name=getattr(r, "name", "") or r.id,
            level=r.level,
            dept=r.dept or "",
        )
        for r in rows
    ]


@app.get("/users/me", response_model=UserPublicOut)
def get_me(principal: Principal = Depends(_principal)) -> UserPublicOut:
    """현재 유저 프로필 — session-context 부트스트랩에 사용."""
    with _db.get_engine().connect() as conn:
        row = conn.execute(
            select(_db.users).where(_db.users.c.id == principal.user_id)
        ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    return UserPublicOut(
        id=row.id,
        name=getattr(row, "name", "") or row.id,
        level=row.level,
        dept=row.dept or "",
    )


@app.post("/sessions", response_model=SessionOut)
def create_session(
    body: SessionCreateIn, principal: Principal = Depends(_principal)
) -> SessionOut:
    """세션 생성/복원. 비멤버는 403(절대원칙 1 — SessionContext 없이 이후 호출 불가)."""
    ctx = _open_session(principal, body.project_id)
    return _session_out(ctx)


@app.post("/sessions/{session_id}/agent", response_model=SessionOut)
def select_session_agent(
    session_id: str,
    body: AgentSelectIn,
    principal: Principal = Depends(_principal),
    x_project_id: str = Header(default=_db.DUMMY_PROJECT_ID, alias="X-Project-Id"),
) -> SessionOut:
    """세션 안에서 활성 에이전트 선택(sessions.select_agent — 가용 목록 밖이면 403)."""
    ctx = _open_session(principal, x_project_id)
    if ctx.session_id != session_id:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없음")
    try:
        ctx = sessions.select_agent(ctx, body.agent_id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return _session_out(ctx)


# --- 프로젝트 CRUD -----------------------------------------------------------------------


def _project_out(project_id: str, role: str, conn) -> ProjectOut:
    """projects 행 + 집계를 ProjectOut으로 변환(동일 connection 재사용)."""
    row = conn.execute(select(_db.projects).where(_db.projects.c.id == project_id)).first()
    if row is None:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    mc = conn.execute(
        select(func.count()).select_from(_db.project_members).where(
            _db.project_members.c.project_id == project_id
        )
    ).scalar() or 0
    adc = conn.execute(
        select(func.count()).select_from(_db.project_data).where(
            _db.project_data.c.project_id == project_id
        )
    ).scalar() or 0
    return ProjectOut(
        id=row.id,
        name=row.name,
        description=getattr(row, "description", "") or "",
        my_role=role,
        member_count=mc,
        attached_data_count=adc,
        max_security_level=getattr(row, "max_security_level", 1) or 1,
    )


@app.post("/projects", response_model=ProjectOut, status_code=201)
def create_project(
    body: ProjectCreateIn, principal: Principal = Depends(_principal)
) -> ProjectOut:
    """프로젝트 생성. 생성자가 자동으로 project_admin. max_security_level ≤ 본인 등급."""
    if not (1 <= body.max_security_level <= principal.level):
        raise HTTPException(status_code=400, detail="max_security_level은 1 이상 본인 등급 이하")
    project_id = f"proj-{uuid.uuid4().hex[:12]}"
    with _db.get_engine().begin() as conn:
        conn.execute(_db.projects.insert().values(
            id=project_id,
            name=body.name,
            description=body.description,
            max_security_level=body.max_security_level,
        ))
        conn.execute(_db.project_members.insert().values(
            project_id=project_id,
            user_id=principal.user_id,
            role="project_admin",
        ))
    with _db.get_engine().connect() as conn:
        return _project_out(project_id, "project_admin", conn)


@app.get("/projects", response_model=list[ProjectOut])
def list_projects(principal: Principal = Depends(_principal)) -> list[ProjectOut]:
    """내가 멤버인 프로젝트 목록(집계 포함)."""
    with _db.get_engine().connect() as conn:
        pm = _db.project_members.alias("pm_self")
        rows = conn.execute(
            select(_db.projects.c.id, pm.c.role)
            .join(pm, pm.c.project_id == _db.projects.c.id)
            .where(pm.c.user_id == principal.user_id)
            .order_by(_db.projects.c.created_at.desc())
        ).all()
        return [_project_out(row.id, row.role, conn) for row in rows]


@app.get("/projects/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, principal: Principal = Depends(_principal)) -> ProjectOut:
    """프로젝트 단건 조회(멤버만 접근)."""
    try:
        m = membership_of(principal, project_id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    with _db.get_engine().connect() as conn:
        return _project_out(project_id, m.role, conn)


@app.get("/projects/{project_id}/members", response_model=list[MemberOut])
def list_project_members(
    project_id: str, principal: Principal = Depends(_principal)
) -> list[MemberOut]:
    """프로젝트 멤버 목록(멤버만 조회 가능)."""
    try:
        membership_of(principal, project_id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    with _db.get_engine().connect() as conn:
        rows = conn.execute(
            select(
                _db.project_members.c.user_id,
                _db.project_members.c.role,
                _db.users.c.level,
                _db.users.c.name,
            )
            .join(_db.users, _db.users.c.id == _db.project_members.c.user_id)
            .where(_db.project_members.c.project_id == project_id)
        ).all()
    return [MemberOut(user_id=r.user_id, role=r.role, level=r.level) for r in rows]


@app.post("/projects/{project_id}/members", status_code=201)
def add_project_member(
    project_id: str, body: MemberAddIn, principal: Principal = Depends(_principal)
) -> dict:
    """멤버 직접 추가(manager·project_admin만). 수락 절차 없음."""
    ctx = _open_session(principal, project_id)
    if ctx.membership.role not in ("manager", "project_admin"):
        raise HTTPException(status_code=403, detail="manager 이상만 멤버를 추가할 수 있습니다")
    with _db.get_engine().connect() as conn:
        user = conn.execute(
            select(_db.users.c.id).where(_db.users.c.id == body.user_id)
        ).first()
    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    with _db.get_engine().begin() as conn:
        stmt = pg_insert(_db.project_members).on_conflict_do_nothing(
            index_elements=["project_id", "user_id"]
        )
        conn.execute(stmt, [{"project_id": project_id, "user_id": body.user_id, "role": body.role}])
    return {"ok": True}


@app.get("/projects/{project_id}/agents", response_model=list[AgentOut])
def list_project_agents(
    project_id: str, principal: Principal = Depends(_principal)
) -> list[AgentOut]:
    """프로젝트 가용 에이전트(principal 등급 이하). 절대원칙 4 — 등급 자동 필터."""
    ctx = _open_session(principal, project_id)
    with _db.get_engine().connect() as conn:
        rows = conn.execute(
            select(_db.agents).where(
                _db.agents.c.project_id == project_id,
                _db.agents.c.security_level <= ctx.principal.level,
            )
        ).all()
    return [
        AgentOut(
            id=r.id,
            name=r.name,
            security_level=r.security_level,
        )
        for r in rows
    ]


# --- 데이터 라이브러리 / 프로젝트 데이터 (게이트 ①②③ 조립) ----------------------------


def _index_info_map(ids: Sequence[str]) -> dict[str, tuple[str, int]]:
    """OpenSearch에서 각 source의 (index_status, chunk_count)를 한 번 조회로 반환.

    OpenSearch가 내려가 있으면 전부 ('unknown', 0) — fail-soft.
    """
    if not ids:
        return {}
    from ..indexing import INDEX_NAME, get_client

    try:
        client = get_client()
        if not client.indices.exists(index=INDEX_NAME):
            return {i: ("unknown", 0) for i in ids}
        resp = client.search(
            index=INDEX_NAME,
            body={
                "size": 0,
                "query": {"terms": {"source": list(ids)}},
                "aggs": {"by_source": {"terms": {"field": "source", "size": len(ids)}}},
            },
        )
        buckets = {b["key"]: b["doc_count"] for b in resp["aggregations"]["by_source"]["buckets"]}
    except Exception:
        return {i: ("unknown", 0) for i in ids}
    return {
        i: ("indexed" if i in buckets else "unknown", buckets.get(i, 0))
        for i in ids
    }


def _list_data(ctx: SessionContext, *, ids: Sequence[str] | None) -> list[DataItemOut]:
    """`data` 테이블에 게이트 ②③(+선택적 ①)을 적용해 DataItemOut으로 어댑트.

    ids=None  -> GET /data (라이브러리: 게이트①은 적용 안 함, ②③만)
    ids=[...] -> GET /projects/{id}/data (게이트① = 연결된 data_id로 미리 좁힌 집합)
    """
    if ids is not None and not ids:
        return []

    stmt = select(_db.data).where(
        _db.data.c.security_level <= ctx.principal.level,                       # 게이트②
        or_(                                                                     # 게이트③
            _db.data.c.visibility == "shared",
            _db.data.c.owner_id == ctx.principal.user_id,
        ),
    )
    if ids is not None:
        stmt = stmt.where(_db.data.c.id.in_(ids))                               # 게이트①

    with _db.get_engine().connect() as conn:
        rows = conn.execute(stmt).all()

    info_map = _index_info_map([row.id for row in rows])
    return [
        DataItemOut.of(
            DataItem(
                id=row.id,
                owner_id=row.owner_id,
                doc_type=row.doc_type,
                security_level=row.security_level,
                visibility=row.visibility,
                dept=row.dept,
                source=row.source,
                filename=getattr(row, "filename", "") or "",
            ),
            index_status=info_map.get(row.id, ("unknown", 0))[0],
            chunk_count=info_map.get(row.id, ("unknown", 0))[1],
        )
        for row in rows
    ]


@app.get("/data", response_model=list[DataItemOut])
def list_library_data(
    principal: Principal = Depends(_principal),
    x_project_id: str = Header(default=_db.DUMMY_PROJECT_ID, alias="X-Project-Id"),
) -> list[DataItemOut]:
    """내 라이브러리 + 접근 가능한 공용 데이터(프로젝트 비격리 — 게이트②③만)."""
    ctx = _open_session(principal, x_project_id)
    return _list_data(ctx, ids=None)


@app.get("/projects/{project_id}/data", response_model=list[DataItemOut])
def list_project_data(
    project_id: str, principal: Principal = Depends(_principal)
) -> list[DataItemOut]:
    """활성 프로젝트에 연결된 데이터(게이트①: projects.attached_source_ids + ②③)."""
    ctx = _open_session(principal, project_id)
    ids = attached_source_ids(ctx)
    return _list_data(ctx, ids=ids)


# 로컬 라이브러리 저장소(MVP: MinIO 대신 디스크). backend/data/library/<data_id><ext>.
_LIBRARY_DIR = Path(__file__).resolve().parents[2] / "data" / "library"


def _save_upload(data_id: str, file: UploadFile) -> Path:
    _LIBRARY_DIR.mkdir(parents=True, exist_ok=True)
    dest = _LIBRARY_DIR / f"{data_id}{Path(file.filename or '').suffix.lower()}"
    with dest.open("wb") as out:
        out.write(file.file.read())
    return dest


@app.post("/data", response_model=DataItemOut)
def upload_data(
    file: UploadFile = File(...),
    security_level: int = Form(...),
    visibility: str = Form(...),
    dept: str = Form(""),
    principal: Principal = Depends(_principal),
) -> DataItemOut:
    """업로드 1건: parsing.parse(P1) → chunking.chunk_and_tag(P2) → indexing(P3) → `data` 행 등록.

    `data_id`(=신규 PK)를 chunk meta.source로 태깅해 색인하므로, 이 응답의 id가 곧 검색/
    project_data의 조인키다. 본인 등급보다 높은 security_level로는 업로드 불가(fail-closed).
    """
    if not (1 <= security_level <= principal.level):
        raise HTTPException(
            status_code=400, detail="security_level은 1 이상, 본인 등급 이하여야 함"
        )
    if visibility not in ("shared", "private"):
        raise HTTPException(status_code=400, detail="visibility는 'shared'|'private'만 허용")

    data_id = f"data-{uuid.uuid4().hex[:12]}"
    original_filename = file.filename or ""
    dest = _save_upload(data_id, file)

    try:
        doc = parsing.parse(str(dest))
    except NotImplementedError as exc:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    chunks = chunking.chunk_and_tag(
        doc,
        owner_id=principal.user_id,
        security_level=security_level,
        dept=dept,
        visibility=visibility,
        data_id=data_id,
    )

    indexing.ensure_index()
    indexing.index_chunks(chunks)

    with _db.get_engine().begin() as conn:
        conn.execute(
            _db.data.insert().values(
                id=data_id,
                owner_id=principal.user_id,
                source=str(dest),
                filename=original_filename,
                doc_type=doc.doc_type,
                security_level=security_level,
                visibility=visibility,
                dept=dept,
            )
        )

    return DataItemOut.of(
        DataItem(
            id=data_id,
            owner_id=principal.user_id,
            doc_type=doc.doc_type,
            security_level=security_level,
            visibility=visibility,
            dept=dept,
            source=str(dest),
            filename=original_filename,
        ),
        index_status="indexed",
        chunk_count=len(chunks),
    )


@app.get("/data/{data_id}/chunks", response_model=list[ChunkOut])
def list_data_chunks(
    data_id: str,
    principal: Principal = Depends(_principal),
    x_project_id: str = Header(default=_db.DUMMY_PROJECT_ID, alias="X-Project-Id"),
) -> list[ChunkOut]:
    """데이터 청크 미리보기 — OpenSearch에서 실제 청크를 반환(최대 20개).

    게이트②③(등급·visibility)을 통과한 데이터만 허용하므로, 권한 없는 항목은 404와 동일하게 처리.
    """
    ctx = _open_session(principal, x_project_id)
    if not _list_data(ctx, ids=[data_id]):
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없거나 접근 권한이 없습니다")

    from ..indexing import INDEX_NAME, get_client

    try:
        client = get_client()
        if not client.indices.exists(index=INDEX_NAME):
            return []
        resp = client.search(
            index=INDEX_NAME,
            body={
                "size": 20,
                "query": {"term": {"source": data_id}},
                "_source": ["content", "security_level", "source", "doc_type"],
            },
        )
    except Exception:
        return []

    return [
        ChunkOut(
            text=hit["_source"]["content"],
            security_level=hit["_source"]["security_level"],
            source=hit["_source"]["source"],
            doc_type=hit["_source"]["doc_type"],
        )
        for hit in resp["hits"]["hits"]
    ]


@app.post("/projects/{project_id}/data", response_model=list[DataItemOut])
def attach_project_data(
    project_id: str, body: AttachDataIn, principal: Principal = Depends(_principal)
) -> list[DataItemOut]:
    """라이브러리 데이터를 활성 프로젝트에 연결(게이트①의 입력 확장 — attach_data: member 이상)."""
    ctx = _open_session(principal, project_id)
    if not can(ctx, "attach_data"):
        raise HTTPException(status_code=403, detail="데이터 연결은 member 이상만 가능")

    with _db.get_engine().begin() as conn:
        existing = conn.execute(
            select(_db.data.c.id).where(_db.data.c.id.in_(body.data_ids))
        ).all()
        ids = [row.id for row in existing]
        if ids:
            stmt = pg_insert(_db.project_data).on_conflict_do_nothing(
                index_elements=["project_id", "data_id"]
            )
            conn.execute(stmt, [{"project_id": project_id, "data_id": i} for i in ids])

    return _list_data(ctx, ids=attached_source_ids(ctx))


# --- 채팅/워크플로우 ------------------------------------------------------------------


@app.post("/chat", response_model=ArtifactOut)
def chat(
    body: ChatRequest,
    principal: Principal = Depends(_principal),
    x_project_id: str = Header(default=_db.DUMMY_PROJECT_ID, alias="X-Project-Id"),
) -> ArtifactOut:
    """질의 1건 실행: require_live_agent(TOCTOU 재검증) → run_workflow → ArtifactOut."""
    ctx = _open_session(principal, x_project_id)

    if body.agent_id is not None and body.agent_id != ctx.active_agent_id:
        try:
            ctx = sessions.select_agent(ctx, body.agent_id)
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc

    try:
        sessions.require_live_agent(ctx)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    artifact = workflows.run_workflow(body.query, ctx=ctx)

    # audit_log: 누가/어느 프로젝트·에이전트로/어떤 질의를 했고 어떤 데이터 집합(게이트①)이
    # 적용됐는지, 결과 등급은 무엇인지 기록(data-model.md audit_log). cloud LLM 라우팅은
    # llm.resolve_endpoint가 별도로 기록한다(절대원칙 6).
    with _db.get_engine().begin() as conn:
        conn.execute(
            _db.audit_log.insert().values(
                user_id=ctx.principal.user_id,
                project_id=ctx.membership.project_id,
                agent_id=ctx.active_agent_id,
                action="chat",
                detail={
                    "query": body.query,
                    "attached_source_ids": attached_source_ids(ctx),
                    "result_security_level": artifact.security_level,
                },
            )
        )

    return ArtifactOut.of(artifact)


# --- LLM 소스(읽기 전용 표식) ----------------------------------------------------------


@app.get("/llm/source", response_model=LlmSourceOut)
def llm_source(principal: Principal = Depends(_principal)) -> LlmSourceOut:
    """전역 on-prem/cloud 모드 표식(절대원칙 6 — 프론트는 읽기만, 토글은 admin 콘솔)."""
    with _db.get_engine().connect() as conn:
        row = conn.execute(
            select(_db.settings.c.value).where(_db.settings.c.key == "llm_source")
        ).first()
        mode = (row.value.get("mode") if row is not None else None) or "on-prem"

        endpoint = conn.execute(
            select(_db.llm_endpoints.c.model)
            .where(_db.llm_endpoints.c.source == mode)
            .order_by(_db.llm_endpoints.c.max_security_level.asc())
            .limit(1)
        ).first()

    provider = f"vLLM ({endpoint.model}, {mode})" if endpoint is not None else mode
    return LlmSourceOut(mode=mode, provider=provider)
