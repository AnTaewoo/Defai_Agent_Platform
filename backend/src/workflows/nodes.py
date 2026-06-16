"""plan / act / observe / finalize 노드."""
from __future__ import annotations

from .state import WorkflowState


def _finalize_answer(state: WorkflowState) -> str:
    """observations를 근거로 최종 답변을 생성. vLLM 미기동 시 observations 이어붙임으로 fallback."""
    from .. import llm

    joined_observations = "\n\n".join(state["observations"])
    messages = [
        {"role": "system", "content": "다음 관찰(observations)을 근거로 사용자의 task에 답하라."},
        {"role": "user", "content": f"task: {state['task']}\n\nobservations:\n{joined_observations}"},
    ]
    try:
        return "".join(llm.chat(messages, principal=state["ctx"].principal, stream=False))
    except Exception:
        return joined_observations


def _plan_node(state: WorkflowState) -> dict:
    """MVP 규칙 기반 플래너.

    steps==0 → search 도구 호출. 이후 observations가 있으면 finalize.
    """
    if state["steps"] == 0:
        return {"next_tool": "search", "done": False}

    if not state["observations"]:
        return {"next_tool": None, "done": True, "answer": ""}

    return {"next_tool": None, "done": True, "answer": _finalize_answer(state)}


def _act_node(state: WorkflowState) -> dict:
    """plan이 고른 도구를 available_tools(ctx)에서 찾아 task로 실행."""
    from .. import tools as _tools

    tool_name = state["next_tool"]
    if tool_name is None:
        return {}

    for tool in _tools.available_tools(state["ctx"]):
        if tool.name == tool_name:
            result = tool.run(state["ctx"], query=state["task"])
            return {"_tool_result": result}

    return {"_tool_result": None}


def _observe_node(state: WorkflowState) -> dict:
    """ToolResult를 observations에 누적하고 running_level/source_ids를 전파."""
    result = state.get("_tool_result")
    steps = state["steps"] + 1

    if result is None:
        return {"steps": steps}

    return {
        "steps": steps,
        "observations": state["observations"] + [result.output],
        "source_ids": state["source_ids"] + list(result.source_ids),
        "chunks_used": state["chunks_used"] + list(result.chunks),
        "running_level": max(state["running_level"], result.security_level),
    }


def _should_continue(state: WorkflowState) -> str:
    """done이거나 max_steps에 도달했으면 finalize, 아니면 plan으로 루프."""
    if state["done"] or state["steps"] >= state["max_steps"]:
        return "finalize"
    return "plan"


def _finalize_node(state: WorkflowState) -> dict:
    """루프를 빠져나올 때 done이 아니면(=max_steps 도달) answer를 채워 finalize한다."""
    if state["done"]:
        return {}
    return {"done": True, "answer": _finalize_answer(state) if state["observations"] else ""}
