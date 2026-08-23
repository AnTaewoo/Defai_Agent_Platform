"""문서 생성 파이프라인. RAG 근거 검색 → vLLM 생성 → 포맷 렌더 → 등급 전파."""
from __future__ import annotations

import logging
import os
import uuid

from sqlalchemy.exc import OperationalError

from ..types import Artifact, Chunk, SessionContext, classify_artifact
from ..projects import _db
from .renderer import render_md, render_docx

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    "당신은 사내 문서 작성 보조 도구입니다. 주어진 근거(citation 포함)를 바탕으로 "
    "사용자의 요청에 맞는 문서를 작성하세요. 각 문단 또는 주장 뒤에는 그 근거가 된 "
    "출처를 `[출처: <source>]` 형식으로 표기하세요. 근거가 없는 내용은 추측하지 말고, "
    "주어진 근거만을 바탕으로 작성하세요."
)


def _build_messages(spec: str, chunks: list[Chunk]) -> list[dict]:
    if chunks:
        evidence_lines = [f"[출처: {c.meta.source}]\n{c.text}" for c in chunks]
        user_content = f"요청:\n{spec}\n\n근거:\n" + "\n\n".join(evidence_lines)
    else:
        user_content = f"요청:\n{spec}\n\n근거: (없음 — 근거 없이 일반적인 내용으로 작성)"

    return [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]


def _fallback_body(chunks: list[Chunk]) -> str:
    if not chunks:
        return "LLM 미가용: 근거 발췌만 포함\n\n(근거 없음)"

    lines = ["LLM 미가용: 근거 발췌만 포함", ""]
    for chunk in chunks:
        lines.append(chunk.text)
        lines.append(f"[출처: {chunk.meta.source}]")
        lines.append("")
    return "\n".join(lines).rstrip()


def _generate_body(spec: str, chunks: list[Chunk], *, ctx: SessionContext) -> str:
    from ..llm import chat

    messages = _build_messages(spec, chunks)
    try:
        return "".join(chat(messages, principal=ctx.principal, stream=False))
    except Exception:
        logger.warning("docgen: llm.chat 실패 - 근거 발췌 fallback으로 진행", exc_info=True)
        return _fallback_body(chunks)


def _artifacts_dir() -> str:
    path = os.environ.get("DAP_ARTIFACTS_DIR", "./data/artifacts")
    os.makedirs(path, exist_ok=True)
    return path


def generate_document(spec: str, *, ctx: SessionContext, fmt: str = "docx") -> Artifact:
    """spec(요청/템플릿)으로 문서를 생성.

    1) 권한 필터 검색으로 근거 수집
    2) vLLM로 본문 생성 + 출처 삽입(미가용 시 근거 발췌 fallback)
    3) fmt에 맞춰 파일 렌더(docx/md)
    4) Artifact.security_level = classify_artifact(ctx, *근거 등급)
    5) DB artifacts 메타 저장(Postgres 미가용이면 건너뜀)
    """
    if fmt not in ("docx", "md"):
        raise NotImplementedError(f"P11: '{fmt}' 렌더러 미구현 (docx/md부터 지원)")

    from ..projects import attached_source_ids
    from ..search import search

    source_ids = attached_source_ids(ctx)
    chunks = search(spec, ctx=ctx, attached_source_ids=source_ids, k=8)

    body = _generate_body(spec, chunks, ctx=ctx)

    security_level = classify_artifact(ctx, *(c.meta.security_level for c in chunks))
    sources = [c.meta.source for c in chunks]

    artifacts_dir = _artifacts_dir()
    artifact_id = uuid.uuid4().hex
    title = spec.strip().splitlines()[0] if spec.strip() else "문서"

    if fmt == "md":
        rendered = render_md(title, body, security_level, sources)
        path = os.path.join(artifacts_dir, f"{artifact_id}.md")
        with open(path, "w", encoding="utf-8") as f:
            f.write(rendered)
    else:  # docx
        path = os.path.join(artifacts_dir, f"{artifact_id}.docx")
        render_docx(path, title, body, security_level, sources)

    try:
        with _db.get_engine().begin() as conn:
            conn.execute(
                _db.artifacts.insert().values(
                    id=artifact_id,
                    project_id=ctx.membership.project_id,
                    kind="document",
                    security_level=security_level,
                    source_ids=sources,
                    path=path,
                    owner_id=ctx.principal.user_id,
                )
            )
    except OperationalError:
        logger.warning("docgen: Postgres 미가용 - artifacts 메타 저장 건너뜀", exc_info=True)

    return Artifact(
        kind="document",
        security_level=security_level,
        source_ids=tuple(sources),
        path=path,
        content=None,
    )
