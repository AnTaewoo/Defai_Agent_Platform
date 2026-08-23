"""워크플로우 실행 진입점."""
from __future__ import annotations

from ..types import Artifact, SessionContext, classify_artifact
from .state import WorkflowState
from .graph import build_graph


def run_workflow(task: str, *, ctx: SessionContext, max_steps: int = 8) -> Artifact:
    """에이전틱 워크플로우 1건 실행.

    ctx(SessionContext) 키워드-온리 필수 — 프로젝트 격리 + 유저별 에이전트/도구 제한.
    누적 등급을 추적해 최종 Artifact.security_level로 전파(classify_artifact, fail-closed).
    """
    initial_level = classify_artifact(ctx)
    initial_state: WorkflowState = {
        "task": task,
        "ctx": ctx,
        "steps": 0,
        "running_level": initial_level,
        "source_ids": [],
        "observations": [],
        "chunks_used": [],
        "done": False,
        "answer": "",
        "next_tool": None,
        "max_steps": max_steps,
        "_tool_result": None,
    }

    graph = build_graph()
    final_state = graph.invoke(initial_state)

    security_level = classify_artifact(ctx, final_state["running_level"])
    source_ids = tuple(dict.fromkeys(final_state["source_ids"]))
    chunks_used = tuple(final_state["chunks_used"])

    return Artifact(
        kind="answer",
        security_level=security_level,
        source_ids=source_ids,
        content=final_state["answer"],
        chunks_used=chunks_used,
    )
