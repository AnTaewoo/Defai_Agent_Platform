"""워크플로우 LangGraph 상태 타입."""
from __future__ import annotations

from typing import TypedDict

from ..types import Chunk, SessionContext, ToolResult


class WorkflowState(TypedDict):
    """LangGraph 상태. SessionContext는 frozen dataclass라 값으로 그대로 담는다."""

    task: str
    ctx: SessionContext
    steps: int
    running_level: int
    source_ids: list[str]
    observations: list[str]
    chunks_used: list[Chunk]
    done: bool
    answer: str
    next_tool: str | None
    max_steps: int
    # act->observe 사이의 스크래치 채널. 미선언 키는 langgraph>=1 StateGraph에서 드롭됨.
    _tool_result: ToolResult | None
