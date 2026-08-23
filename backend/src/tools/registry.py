"""도구 레지스트리 + 가용 목록."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from ..types import SessionContext, ToolResult
from .search_tool import _run_search
from .docgen_tool import _run_generate_document
from .codegen_tool import _run_generate_code, _run_run_code


class ToolRun(Protocol):
    """도구 실행 호출 계약. 모든 도구는 ctx를 받는다(권한 없는 실행 불가)."""
    def __call__(self, ctx: SessionContext, **kwargs) -> ToolResult: ...


@dataclass(frozen=True)
class Tool:
    name: str
    description: str
    required_level: int
    run: ToolRun

    def view(self) -> "ToolView":
        return ToolView(name=self.name, description=self.description, required_level=self.required_level)


@dataclass(frozen=True)
class ToolView:
    """Tool의 표현 계층 DTO(실행 함수 제외 — 직렬화 가능)."""
    name: str
    description: str
    required_level: int


_TOOLS: tuple[Tool, ...] = (
    Tool(
        name="search",
        description="활성 프로젝트에 연결된 문서에서 권한 필터를 적용한 하이브리드(BM25+벡터) 검색을 수행한다.",
        required_level=1,
        run=_run_search,
    ),
    Tool(
        name="generate_document",
        description="검색 근거와 출처를 바탕으로 문서(docx/pdf/pptx/xlsx/md)를 생성한다.",
        required_level=1,
        run=_run_generate_document,
    ),
    Tool(
        name="generate_code",
        description="요청 사양(spec)에 맞는 코드를 생성한다(실행하지 않음).",
        required_level=1,
        run=_run_generate_code,
    ),
    Tool(
        name="run_code",
        description="생성된 코드를 망 차단 샌드박스에서 실행하고 결과를 반환한다.",
        required_level=1,
        run=_run_run_code,
    ),
)


def available_tools(ctx: SessionContext) -> list[Tool]:
    """이 세션에서 호출 가능한 도구만 노출(실행 핸들 포함, 내부용)."""
    return [t for t in _TOOLS if t.required_level <= ctx.principal.level]


def available_tool_views(ctx: SessionContext) -> list[ToolView]:
    """api/프론트로 내보낼 직렬화 가능한 도구 목록(실행 함수 제외)."""
    return [t.view() for t in available_tools(ctx)]
