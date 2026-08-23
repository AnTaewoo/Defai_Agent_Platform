"""코드 생성·실행 도구."""
from __future__ import annotations

from ..types import SessionContext, ToolResult


def _run_generate_code(ctx: SessionContext, *, spec: str, language: str = "python", **_kwargs) -> ToolResult:
    """코드 생성 위임(P12, 실행 없음). Artifact -> ToolResult 변환."""
    from ..codegen import generate_code as _generate_code

    artifact = _generate_code(spec, ctx=ctx, language=language)
    return ToolResult(
        tool="generate_code",
        security_level=artifact.security_level,
        output=artifact.path or artifact.content or "",
        source_ids=artifact.source_ids,
    )


def _run_run_code(ctx: SessionContext, *, code: str, **_kwargs) -> ToolResult:
    """망 차단 샌드박스에서 코드 실행 위임(P12). 결과는 이미 ToolResult로 등급이 매겨져 있다."""
    from ..codegen import run_in_sandbox

    return run_in_sandbox(code, ctx=ctx)
