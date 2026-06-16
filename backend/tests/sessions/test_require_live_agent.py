"""[A2] 실행시점 에이전트 재검증."""
import pytest
from sqlalchemy.exc import OperationalError

from src.projects import _db
from src.sessions import require_live_agent, select_agent
from src.types import Principal, ProjectMembership, SessionContext


def test_none_active_agent_rejected():
    ctx = SessionContext(session_id="s", principal=Principal("u", 3),
                         membership=ProjectMembership("p1", "member"), active_agent_id=None)
    with pytest.raises(PermissionError):
        require_live_agent(ctx)


def test_select_then_require_live_agent_succeeds_for_available_agent():
    """P13(select_agent) <-> P5(available_agents) 연결: 가용 에이전트를 선택하면
    require_live_agent가 재검증을 통과한다."""
    try:
        _db.ensure_schema()
        _db.seed_dummy_project()
    except OperationalError:
        pytest.skip("Postgres not reachable - skipping P5/P13 integration test")

    ctx = SessionContext(
        session_id="s-test-live-agent",
        principal=Principal(user_id="u-l5", level=5),
        membership=ProjectMembership(project_id=_db.DUMMY_PROJECT_ID, role="project_admin"),
    )

    with _db.get_engine().begin() as conn:
        conn.execute(
            _db.sessions.insert().values(
                id=ctx.session_id,
                user_id=ctx.principal.user_id,
                project_id=ctx.membership.project_id,
                active_agent_id=None,
            )
        )

    try:
        ctx = select_agent(ctx, _db.DUMMY_AGENT_ID)
        assert require_live_agent(ctx) == _db.DUMMY_AGENT_ID
    finally:
        with _db.get_engine().begin() as conn:
            conn.execute(_db.sessions.delete().where(_db.sessions.c.id == ctx.session_id))
