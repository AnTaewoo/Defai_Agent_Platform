"""[P10] available_tools — 권한 기반 도구 노출."""
from src.tools import available_tools, available_tool_views
from src.types import Principal, ProjectMembership, SessionContext


def _ctx(level: int = 1, role: str = "member") -> SessionContext:
    return SessionContext(
        session_id="s1",
        principal=Principal(user_id="u-test", level=level),
        membership=ProjectMembership(project_id="proj-default", role=role),
    )


def test_available_tools_returns_core_four():
    names = {t.name for t in available_tools(_ctx())}
    assert names == {"search", "generate_document", "generate_code", "run_code"}


def test_available_tool_views_do_not_expose_run_handle():
    views = available_tool_views(_ctx())
    assert len(views) == 4
    for v in views:
        assert hasattr(v, "run") is False


def test_available_tools_filters_by_required_level():
    # 모든 코어 도구는 required_level=1 이므로 level<1인 유저는 없지만(보안등급 최소 1),
    # 최소 등급에서도 4개 모두 보여야 한다.
    names = {t.name for t in available_tools(_ctx(level=1))}
    assert names == {"search", "generate_document", "generate_code", "run_code"}
