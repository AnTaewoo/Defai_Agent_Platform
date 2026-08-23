"""LangGraph 그래프 빌드."""
from __future__ import annotations

from .state import WorkflowState
from .nodes import _plan_node, _act_node, _observe_node, _should_continue, _finalize_node


def build_graph():
    """plan->act->observe->(plan|finalize) 그래프를 컴파일해 반환."""
    from langgraph.graph import END, StateGraph

    graph = StateGraph(WorkflowState)
    graph.add_node("plan", _plan_node)
    graph.add_node("act", _act_node)
    graph.add_node("observe", _observe_node)
    graph.add_node("finalize", _finalize_node)

    graph.set_entry_point("plan")
    graph.add_conditional_edges(
        "plan",
        lambda state: "finalize" if state["done"] else "act",
        {"act": "act", "finalize": "finalize"},
    )
    graph.add_edge("act", "observe")
    graph.add_conditional_edges(
        "observe",
        _should_continue,
        {"plan": "plan", "finalize": "finalize"},
    )
    graph.add_edge("finalize", END)

    return graph.compile()
