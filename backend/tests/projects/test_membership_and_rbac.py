"""[P13] 프로젝트 멤버십 + RBAC + 데이터 연결(attach) 테스트.

Postgres가 없으면(개발 인프라 미기동) 스킵한다 — tests/indexing의 client.ping() 스킵 패턴과 동일.
"""
import pytest
from sqlalchemy.exc import OperationalError

from src import projects
from src.projects import _db
from src.types import Principal, ProjectMembership, SessionContext


@pytest.fixture(scope="module", autouse=True)
def _seeded_db():
    try:
        _db.ensure_schema()
        _db.seed_dummy_project()
    except OperationalError:
        pytest.skip("Postgres not reachable - skipping P13 integration tests")


def _ctx(user_id: str, level: int, role: str) -> SessionContext:
    return SessionContext(
        session_id="s1",
        principal=Principal(user_id=user_id, level=level),
        membership=ProjectMembership(project_id=_db.DUMMY_PROJECT_ID, role=role),
    )


def test_membership_of_returns_role_for_member():
    m = projects.membership_of(Principal(user_id="u-l2", level=2), _db.DUMMY_PROJECT_ID)
    assert m == ProjectMembership(project_id=_db.DUMMY_PROJECT_ID, role="member")


def test_membership_of_raises_for_non_member():
    with pytest.raises(PermissionError):
        projects.membership_of(Principal(user_id="ghost", level=5), _db.DUMMY_PROJECT_ID)


def test_attached_source_ids_returns_connected_data():
    ids = projects.attached_source_ids(_ctx("u-l2", 2, "member"))
    assert set(ids) == {"data-1", "data-2", "data-3"}


@pytest.mark.parametrize(
    "role,action,expected",
    [
        ("viewer", "view", True),
        ("viewer", "attach_data", False),
        ("member", "attach_data", True),
        ("member", "edit_config", False),
        ("editor", "edit_config", True),
        ("editor", "manage_members", False),
        ("manager", "manage_members", True),
        ("manager", "manage_agents", False),
        ("project_admin", "manage_agents", True),
        ("project_admin", "manage_project", True),
    ],
)
def test_can_role_action_matrix(role, action, expected):
    assert projects.can(_ctx("u", 5, role), action) is expected


def test_can_unknown_action_raises():
    with pytest.raises(ValueError):
        projects.can(_ctx("u", 5, "project_admin"), "not_a_real_action")


def test_add_project_agent_rejects_above_own_clearance():
    ctx = _ctx("u-l5", 5, "project_admin")
    with pytest.raises(PermissionError):
        projects.add_project_agent(ctx, _db.DUMMY_AGENT_ID, agent_security_level=99)


def test_add_project_agent_rejects_non_admin():
    ctx = _ctx("u-l4", 4, "manager")
    with pytest.raises(PermissionError):
        projects.add_project_agent(ctx, _db.DUMMY_AGENT_ID, agent_security_level=4)


def test_add_project_agent_succeeds_for_project_admin_within_clearance():
    ctx = _ctx("u-l5", 5, "project_admin")
    projects.add_project_agent(ctx, _db.DUMMY_AGENT_ID, agent_security_level=5)
