"""[P13] 세션 생성/복원 — (user, project)당 세션 행을 멱등하게 생성·복원한다."""
import pytest
from sqlalchemy.exc import OperationalError

from src import sessions
from src.projects import _db
from src.types import Principal


@pytest.fixture(scope="module", autouse=True)
def _seeded_db():
    try:
        _db.ensure_schema()
        _db.seed_dummy_project()
    except OperationalError:
        pytest.skip("Postgres not reachable - skipping P13 integration tests")


def test_open_session_creates_then_restores_same_session():
    principal = Principal(user_id="u-l2", level=2)

    ctx1 = sessions.open_session(principal, _db.DUMMY_PROJECT_ID)
    assert ctx1.membership.role == "member"
    assert ctx1.active_agent_id is None

    ctx2 = sessions.open_session(principal, _db.DUMMY_PROJECT_ID)
    assert ctx2.session_id == ctx1.session_id


def test_open_session_rejects_non_member():
    with pytest.raises(PermissionError):
        sessions.open_session(Principal(user_id="ghost", level=5), _db.DUMMY_PROJECT_ID)
