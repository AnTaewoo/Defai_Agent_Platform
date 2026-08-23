"""[P13] Postgres 영속 계층. 권한 코어(projects/sessions/agents)가 공유한다
(docs/conventions.md 모듈 경계 예외).

연결 문자열은 DATABASE_URL 환경변수(기본값은 infra/docker-compose.yml의 개발용 postgres).
ensure_schema()는 모든 테이블을 idempotent하게 생성한다(개발용 — 운영은 Alembic 마이그레이션).
seed_dummy_project()는 ROADMAP의 "단일 더미 프로젝트로 MVP 가능" 전제를 위한 시드 데이터를 채운다.

테이블 정의는 docs/data-model.md / docs/projects-rbac.md §5의 개념 스키마를 그대로 코드화한다.
"""
from __future__ import annotations

import os

from sqlalchemy import (
    Column,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    TIMESTAMP,
    create_engine,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, insert as pg_insert
from sqlalchemy.engine import Engine

_DEFAULT_DSN = "postgresql+psycopg://rag:change_me@localhost:5432/ragmeta"

metadata = MetaData()

users = Table(
    "users",
    metadata,
    Column("id", String, primary_key=True),
    Column("sso_subject", String, unique=True),
    Column("level", Integer, nullable=False),
    Column("dept", String, nullable=False, server_default=""),
    Column("name", String, nullable=False, server_default=""),
)

projects = Table(
    "projects",
    metadata,
    Column("id", String, primary_key=True),
    Column("name", String, nullable=False),
    Column("description", String, nullable=False, server_default=""),
    Column("max_security_level", Integer, nullable=False, server_default="1"),
    Column("created_at", TIMESTAMP, server_default=func.now()),
)

project_members = Table(
    "project_members",
    metadata,
    Column("project_id", String, ForeignKey("projects.id"), primary_key=True),
    Column("user_id", String, ForeignKey("users.id"), primary_key=True),
    Column("role", String, nullable=False),
)

# 프로젝트 독립 데이터 라이브러리(업로드 단위). OpenSearch 청크 meta.source가 이 id를 참조한다.
data = Table(
    "data",
    metadata,
    Column("id", String, primary_key=True),
    Column("owner_id", String, ForeignKey("users.id"), nullable=False),
    Column("source", String),
    Column("filename", String, nullable=False, server_default=""),  # 원본 업로드 파일명
    Column("doc_type", String, nullable=False),
    Column("security_level", Integer, nullable=False),
    Column("visibility", String, nullable=False),
    Column("dept", String, nullable=False, server_default=""),
    Column("created_at", TIMESTAMP, server_default=func.now()),
)

# 라이브러리 데이터 <-> 프로젝트 연결(N:M). 검색 게이트①(attached_source_ids)의 원천.
project_data = Table(
    "project_data",
    metadata,
    Column("project_id", String, ForeignKey("projects.id"), primary_key=True),
    Column("data_id", String, ForeignKey("data.id"), primary_key=True),
    Column("attached_at", TIMESTAMP, server_default=func.now()),
)

# 등급 -> vLLM 엔드포인트 매핑. source: "on-prem" | "cloud"(admin 전역 토글 예외, 절대원칙 6).
llm_endpoints = Table(
    "llm_endpoints",
    metadata,
    Column("id", String, primary_key=True),
    Column("base_url", String, nullable=False),
    Column("model", String, nullable=False),
    Column("max_security_level", Integer, nullable=False),
    Column("source", String, nullable=False, server_default="on-prem"),
)

# project_id가 NULL이면 아직 어떤 프로젝트에도 편입되지 않은 카탈로그 에이전트.
# security_level은 model_endpoint(서빙 모델) 등급에서 자동 부여(수동 입력 없음, ADR-6).
agents = Table(
    "agents",
    metadata,
    Column("id", String, primary_key=True),
    Column("project_id", String, ForeignKey("projects.id"), nullable=True),
    Column("name", String, nullable=False),
    Column("security_level", Integer, nullable=False),
    Column("model_endpoint_id", String, ForeignKey("llm_endpoints.id")),
    Column("config_json", JSONB, nullable=False, server_default="{}"),
)

# 유저별 세션. (user, project)에 묶이고, active_agent_id는 세션 안에서 선택/전환된다.
sessions = Table(
    "sessions",
    metadata,
    Column("id", String, primary_key=True),
    Column("user_id", String, ForeignKey("users.id"), nullable=False),
    Column("project_id", String, ForeignKey("projects.id"), nullable=False),
    Column("active_agent_id", String, ForeignKey("agents.id"), nullable=True),
    Column("created_at", TIMESTAMP, server_default=func.now()),
)

messages = Table(
    "messages",
    metadata,
    Column("id", String, primary_key=True),
    Column("session_id", String, ForeignKey("sessions.id"), nullable=False),
    Column("role", String, nullable=False),
    Column("content", Text, nullable=False),
    Column("source_ids", ARRAY(String), nullable=False, server_default="{}"),
    Column("created_at", TIMESTAMP, server_default=func.now()),
)

artifacts = Table(
    "artifacts",
    metadata,
    Column("id", String, primary_key=True),
    Column("project_id", String, ForeignKey("projects.id"), nullable=False),
    Column("kind", String, nullable=False),
    Column("security_level", Integer, nullable=False),
    Column("source_ids", ARRAY(String), nullable=False, server_default="{}"),
    Column("path", String),
    Column("owner_id", String, ForeignKey("users.id"), nullable=False),
    Column("created_at", TIMESTAMP, server_default=func.now()),
)

audit_log = Table(
    "audit_log",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", String),
    Column("project_id", String),
    Column("agent_id", String),
    Column("action", String, nullable=False),
    Column("detail", JSONB, nullable=False, server_default="{}"),
    Column("ts", TIMESTAMP, server_default=func.now()),
)

# 전역 admin 설정(예: llm_source = {"mode": "on-prem"|"cloud"}). 단일 키-값, 절대원칙 6.
settings = Table(
    "settings",
    metadata,
    Column("key", String, primary_key=True),
    Column("value", JSONB, nullable=False),
)


DUMMY_PROJECT_ID = "proj-default"
DUMMY_AGENT_ID = "agent-default"
DUMMY_ENDPOINT_ID = "ep-onprem"

_engine: Engine | None = None


def get_engine() -> Engine:
    """프로세스 전역 SQLAlchemy 엔진(지연 생성, 커넥션풀 재사용)."""
    global _engine
    if _engine is None:
        dsn = os.environ.get("DATABASE_URL", _DEFAULT_DSN)
        _engine = create_engine(dsn, future=True)
    return _engine


def ensure_schema(engine: Engine | None = None) -> None:
    """모든 테이블을 idempotent하게 생성(개발용. 운영은 Alembic).

    기존 테이블에 컬럼이 추가됐을 때는 ALTER TABLE … ADD COLUMN IF NOT EXISTS로 보완한다.
    """
    eng = engine or get_engine()
    metadata.create_all(eng)
    # 기존 data 테이블에 filename 컬럼이 없으면 추가(idempotent).
    with eng.begin() as conn:
        _t = __import__("sqlalchemy").text
        conn.execute(_t("ALTER TABLE data ADD COLUMN IF NOT EXISTS filename TEXT NOT NULL DEFAULT ''"))
        conn.execute(_t("ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''"))
        conn.execute(_t("ALTER TABLE projects ADD COLUMN IF NOT EXISTS max_security_level INTEGER NOT NULL DEFAULT 1"))
        conn.execute(_t("ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT ''"))
        # 시드 유저 이름 백필(idempotent — name이 이미 있으면 무시)
        conn.execute(_t("""
            UPDATE users SET name = CASE
                WHEN id='u-l1' THEN '김민준'
                WHEN id='u-l2' THEN '이서연'
                WHEN id='u-l3' THEN '박지훈'
                WHEN id='u-l4' THEN '최유나'
                WHEN id='u-l5' THEN '정도현'
                ELSE name
            END
            WHERE id IN ('u-l1','u-l2','u-l3','u-l4','u-l5') AND name=''
        """))


def seed_dummy_project(engine: Engine | None = None) -> None:
    """더미 프로젝트 1개 + L1~L5 유저 + 더미 data/project_data/agent/llm_endpoint 시드(idempotent).

    ROADMAP "MVP는 단일 더미 프로젝트로 가능" 전제. project_members 역할은
    docs/projects-rbac.md §3의 5역할을 각 등급 유저에 1개씩 매핑해 RBAC 테스트가 가능하게 한다.
    """
    engine = engine or get_engine()
    with engine.begin() as conn:
        for tbl, rows in (
            (
                users,
                [
                    {"id": "u-l5", "sso_subject": "sso-u-l5", "level": 5, "dept": "", "name": "관리자"},
                ],
            ),
            (projects, [{"id": DUMMY_PROJECT_ID, "name": "Default Project"}]),
            (
                project_members,
                [
                    {"project_id": DUMMY_PROJECT_ID, "user_id": "u-l5", "role": "project_admin"},
                ],
            ),
            (
                llm_endpoints,
                [
                    {
                        "id": DUMMY_ENDPOINT_ID,
                        # 백엔드는 docker-compose 밖 호스트에서 uvicorn으로 직접 띈다(컨테이너화된
                        # backend 서비스 없음) - vllm 컨테이너의 8000 포트는 호스트로 publish되므로
                        # localhost로 접근한다. backend를 compose 서비스로 옮기면 `http://vllm:8000/v1`
                        # (서비스명 DNS)로 바꿔야 한다.
                        # model은 vllm 컨테이너의 --model과 일치해야 함(OpenAI 호환 서버가
                        # 이 이름으로만 응답).
                        "base_url": "http://localhost:8000/v1",
                        "model": "Qwen/Qwen2.5-3B-Instruct",
                        "max_security_level": 5,
                        "source": "on-prem",
                    }
                ],
            ),
            (
                agents,
                [
                    {
                        "id": DUMMY_AGENT_ID,
                        "project_id": DUMMY_PROJECT_ID,
                        "name": "기본 에이전트",
                        "security_level": 5,
                        "model_endpoint_id": DUMMY_ENDPOINT_ID,
                        "config_json": {},
                    }
                ],
            ),
            (settings, [{"key": "llm_source", "value": {"mode": "on-prem"}}]),
        ):
            pk_cols = [c.name for c in tbl.primary_key.columns]
            stmt = pg_insert(tbl).on_conflict_do_nothing(index_elements=pk_cols)
            conn.execute(stmt, rows)
