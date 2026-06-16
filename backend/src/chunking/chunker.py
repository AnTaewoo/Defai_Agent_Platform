"""청킹 + 보안 메타데이터 태깅 로직."""
from __future__ import annotations

from ..types import Chunk, ParsedDocument, SecurityMeta

_DEFAULT_MAX_CHARS = 800


def chunk_and_tag(
    doc: ParsedDocument,
    *,
    owner_id: str,
    security_level: int,
    dept: str,
    visibility: str = "private",
    data_id: str | None = None,
    max_chars: int = _DEFAULT_MAX_CHARS,
) -> list[Chunk]:
    """문서를 청킹하면서 모든 청크에 보안 메타를 빠짐없이 태깅.

    meta.source = data_id(검색 격리 조인키) 또는 MVP 편의상 doc.source(원본 경로).
    """
    if visibility not in ("shared", "private"):
        raise ValueError(f"visibility must be 'shared' or 'private', got {visibility!r}")

    meta = SecurityMeta(
        security_level=security_level,
        dept=dept,
        source=data_id or doc.source,
        doc_type=doc.doc_type,
        owner_id=owner_id,
        visibility=visibility,
    )

    chunks: list[Chunk] = []

    for block in doc.text_blocks:
        for piece in _split_text(block, max_chars):
            chunks.append(Chunk(text=piece, meta=meta))

    for table in doc.tables:
        chunks.append(Chunk(text=_serialize_table(table), meta=meta))

    return chunks


def _split_text(text: str, max_chars: int) -> list[str]:
    """문단(빈 줄) 단위로 나누고, max_chars를 넘는 문단은 단어 경계에서 추가 분할."""
    paragraphs = [p.strip() for p in text.split("\n\n")]
    pieces: list[str] = []

    for para in paragraphs:
        if not para:
            continue
        if len(para) <= max_chars:
            pieces.append(para)
            continue

        words = para.split()
        current: list[str] = []
        current_len = 0
        for word in words:
            extra = len(word) + (1 if current else 0)
            if current and current_len + extra > max_chars:
                pieces.append(" ".join(current))
                current = [word]
                current_len = len(word)
            else:
                current.append(word)
                current_len += extra
        if current:
            pieces.append(" ".join(current))

    return pieces


def _serialize_table(table: list[list[str]]) -> str:
    """표를 행 단위 텍스트로 직렬화(셀은 ' | '로 구분, 행은 줄바꿈으로 구분)."""
    return "\n".join(" | ".join(row) for row in table)
