"""문서 생성 도구 실행."""
from __future__ import annotations

from ..types import SessionContext, ToolResult


def _run_generate_document(ctx: SessionContext, *, spec: str, fmt: str = "docx", **_kwargs) -> ToolResult:
    """문서 생성 위임(P11). Artifact -> ToolResult 변환(등급/출처 그대로 전달)."""
    from ..docgen import generate_document as _generate_document

    artifact = _generate_document(spec, ctx=ctx, fmt=fmt)
    return ToolResult(
        tool="generate_document",
        security_level=artifact.security_level,
        output=artifact.path or artifact.content or "",
        source_ids=artifact.source_ids,
    )
