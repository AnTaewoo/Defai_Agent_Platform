"""[P5] available_agents — 프로젝트 보유 에이전트 ∩ 등급 자동 가용.

Postgres가 없으면(개발 인프라 미기동) 스킵한다 — tests/projects/test_membership_and_rbac.py와 동일 패턴.
"""
import pytest
from sqlalchemy.exc import OperationalError

from src.agents import available_agents
from src.projects import _db
from src.types import Principal, ProjectMembership, SessionContext


@pytest.fixture(scope="module", autouse=True)
def _seeded_db():
    try:
        _db.ensure_schema()
        _db.seed_dummy_project()
    except OperationalError:
        pytest.skip("Postgres not reachable - skipping P5 integration tests")


def _ctx(user_id: str, level: int, role: str = "member") -> SessionContext:
    return SessionContext(
        session_id="s1",
        principal=Principal(user_id=user_id, level=level),
        membership=ProjectMembership(project_id=_db.DUMMY_PROJECT_ID, role=role),
    )


def test_user_at_or_above_agent_level_sees_default_agent():
    ctx = _ctx("u-l5", 5)
    assert _db.DUMMY_AGENT_ID in available_agents(ctx)


def test_user_below_agent_level_does_not_see_default_agent():
    ctx = _ctx("u-l2", 2)
    assert _db.DUMMY_AGENT_ID not in available_agents(ctx)


def test_unrelated_project_sees_no_agents():
    ctx = SessionContext(
        session_id="s2",
        principal=Principal(user_id="u-l5", level=5),
        membership=ProjectMembership(project_id="proj-does-not-exist", role="member"),
    )
    assert available_agents(ctx) == []
