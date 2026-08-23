"""[P10] run_workflow — LangGraph plan->act->observe 루프 + max_steps 상한 + 등급 전파."""
import pytest
from sqlalchemy.exc import OperationalError

from src.projects import _db
from src.types import Principal, ProjectMembership, SessionContext


@pytest.fixture(scope="module", autouse=True)
def _seeded_db():
    try:
        _db.ensure_schema()
        _db.seed_dummy_project()
    except OperationalError:
        pytest.skip("Postgres not reachable - skipping P10 integration tests")


def _ctx() -> SessionContext:
    return SessionContext(
        session_id="s1",
        principal=Principal(user_id="u-l3", level=3),
        membership=ProjectMembership(project_id=_db.DUMMY_PROJECT_ID, role="editor"),
    )


def test_run_workflow_returns_answer_artifact_with_valid_level():
    from src.workflows import run_workflow

    ctx = _ctx()
    artifact = run_workflow("테스트 질의", ctx=ctx, max_steps=3)

    assert artifact.kind == "answer"
    # fail-closed 불변식: 생성물 등급은 행위자 클리어런스 이상.
    assert artifact.security_level >= ctx.principal.level
    assert len(artifact.source_ids) >= 0
    assert isinstance(artifact.content, str)


def test_run_workflow_respects_max_steps():
    from src.workflows import run_workflow

    ctx = _ctx()
    # max_steps가 매우 작아도 예외 없이 종료되어야 한다.
    artifact = run_workflow("테스트 질의", ctx=ctx, max_steps=1)
    assert artifact.kind == "answer"
    assert artifact.security_level >= ctx.principal.level


def test_max_steps_terminates_when_plan_never_done(monkeypatch):
    """plan이 항상 done=False를 반환해도 max_steps에서 루프가 끊기는지 순수 로직으로 검증."""
    import src.workflows as workflows

    def _never_done_plan(state):
        # search를 반복 선택하도록 강제(steps==0 분기와 동일하게 next_tool="search").
        return {"next_tool": "search", "done": False}

    monkeypatch.setattr(workflows, "_plan_node", _never_done_plan)

    graph = workflows.build_graph()

    ctx = _ctx()
    initial_state: workflows.WorkflowState = {
        "task": "테스트 질의",
        "ctx": ctx,
        "steps": 0,
        "running_level": workflows.classify_artifact(ctx),
        "source_ids": [],
        "observations": [],
        "done": False,
        "answer": "",
        "next_tool": None,
        "max_steps": 2,
    }

    final_state = graph.invoke(initial_state)

    # max_steps에서 멈췄어야 한다 (무한루프 아님).
    assert final_state["steps"] <= initial_state["max_steps"] + 1
    assert final_state["done"] is True
