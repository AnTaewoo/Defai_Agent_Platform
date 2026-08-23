"""검색 도구 실행."""
from __future__ import annotations

from ..types import SessionContext, ToolResult, classify_artifact

_MAX_OUTPUT_CHARS = 8000
_CHUNK_SEP = "\n\n---\n\n"


def _run_search(ctx: SessionContext, *, query: str, **_kwargs) -> ToolResult:
    """권한 필터된 하이브리드 검색. 결과 등급 = classify_artifact(ctx, *청크 등급들)."""
    from ..projects import attached_source_ids
    from ..search import search as _search

    chunks = _search(query, ctx=ctx, attached_source_ids=attached_source_ids(ctx))
    security_level = classify_artifact(ctx, *(c.meta.security_level for c in chunks))
    output = _CHUNK_SEP.join(c.text for c in chunks)[:_MAX_OUTPUT_CHARS]
    source_ids = tuple(c.meta.source for c in chunks)
    return ToolResult(
        tool="search",
        security_level=security_level,
        output=output,
        source_ids=source_ids,
        chunks=tuple(chunks),
    )
