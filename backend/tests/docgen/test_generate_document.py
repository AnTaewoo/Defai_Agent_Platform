"""[P11] generate_document — 검색→생성→렌더 파이프라인 + 등급 전파 테스트."""
from __future__ import annotations

from unittest.mock import patch

import pytest
from sqlalchemy import select
from sqlalchemy.exc import OperationalError

from src.docgen import generate_document
from src.projects import _db
from src.types import (
    Chunk,
    Principal,
    ProjectMembership,
    SecurityMeta,
    SessionContext,
    classify_artifact,
)


def _ctx(level: int = 2) -> SessionContext:
    return SessionContext(
        session_id="s-docgen",
        principal=Principal(user_id="u-l2", level=level),
        membership=ProjectMembership(project_id=_db.DUMMY_PROJECT_ID, role="member"),
    )


def _chunk(text: str, *, security_level: int, source: str, visibility: str = "shared") -> Chunk:
    return Chunk(
        text=text,
        meta=SecurityMeta(
            security_level=security_level,
            dept="연구",
            source=source,
            doc_type="pdf",
            owner_id="u-l3",
            visibility=visibility,
        ),
        embedding=None,
    )


_CHUNKS = [
    _chunk("공개 자료 발췌입니다.", security_level=1, source="data-1"),
    _chunk("내부 연구 자료 발췌입니다.", security_level=3, source="data-2"),
]


@pytest.fixture(autouse=True)
def _artifacts_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("DAP_ARTIFACTS_DIR", str(tmp_path))
    return tmp_path


@pytest.fixture(autouse=True)
def _no_attached_ids():
    with patch("src.projects.attached_source_ids", return_value=["data-1", "data-2"]):
        yield


def test_generate_document_with_llm_success(tmp_path):
    ctx = _ctx(level=2)

    with patch("src.search.search", return_value=list(_CHUNKS)) as mock_search, \
         patch("src.llm.chat", return_value=iter(["생성된 본문입니다. [출처: data-1]"])) as mock_chat:
        artifact = generate_document("분기 보고서 작성해줘", ctx=ctx, fmt="docx")

    mock_search.assert_called_once()
    mock_chat.assert_called_once()

    assert artifact.kind == "document"
    assert artifact.security_level == classify_artifact(ctx, 1, 3)
    assert artifact.security_level == 3
    assert artifact.source_ids == ("data-1", "data-2")
    assert artifact.path is not None
    assert artifact.content is None

    path = artifact.path
    assert path.startswith(str(tmp_path))
    import os
    assert os.path.exists(path)

    from docx import Document
    doc = Document(path)
    full_text = "\n".join(p.text for p in doc.paragraphs)
    assert "L3" in full_text
    assert "data-1" in full_text
    assert "data-2" in full_text
    assert "생성된 본문입니다" in full_text


def test_generate_document_llm_unavailable_fallback(tmp_path):
    ctx = _ctx(level=2)

    with patch("src.search.search", return_value=list(_CHUNKS)), \
         patch("src.llm.chat", side_effect=ConnectionError("vLLM down")):
        artifact = generate_document("분기 보고서 작성해줘", ctx=ctx, fmt="md")

    assert artifact.security_level == classify_artifact(ctx, 1, 3)
    assert artifact.source_ids == ("data-1", "data-2")

    with open(artifact.path, encoding="utf-8") as f:
        content = f.read()

    assert "L3" in content
    assert "LLM 미가용" in content
    assert "공개 자료 발췌입니다." in content
    assert "[출처: data-1]" in content
    assert "[출처: data-2]" in content


def test_security_level_floors_at_actor_clearance(tmp_path):
    """소스 등급이 모두 행위자 등급보다 낮으면 행위자 등급(fail-closed)으로 과분류."""
    ctx = _ctx(level=4)
    low_chunks = [
        _chunk("낮은 등급 자료1", security_level=1, source="data-1"),
        _chunk("낮은 등급 자료2", security_level=2, source="data-2"),
    ]

    with patch("src.search.search", return_value=low_chunks), \
         patch("src.llm.chat", return_value=iter(["본문"])):
        artifact = generate_document("요약해줘", ctx=ctx, fmt="md")

    assert artifact.security_level == classify_artifact(ctx, 1, 2)
    assert artifact.security_level == 4


def test_no_evidence_uses_actor_clearance_floor(tmp_path):
    ctx = _ctx(level=3)

    with patch("src.search.search", return_value=[]), \
         patch("src.llm.chat", return_value=iter(["근거 없이 작성한 본문"])):
        artifact = generate_document("일반 문서 작성해줘", ctx=ctx, fmt="md")

    assert artifact.security_level == classify_artifact(ctx)
    assert artifact.security_level == 3
    assert artifact.source_ids == ()


def test_unsupported_format_raises_not_implemented():
    ctx = _ctx(level=2)

    with patch("src.search.search", return_value=[]), \
         patch("src.llm.chat", return_value=iter(["본문"])):
        with pytest.raises(NotImplementedError):
            generate_document("요청", ctx=ctx, fmt="pptx")


@pytest.fixture(scope="module", autouse=False)
def _seeded_db():
    try:
        _db.ensure_schema()
        _db.seed_dummy_project()
    except OperationalError:
        pytest.skip("Postgres not reachable - skipping artifacts persistence check")


def test_artifacts_metadata_persisted_when_postgres_available(tmp_path, monkeypatch):
    try:
        _db.ensure_schema()
        _db.seed_dummy_project()
    except OperationalError:
        pytest.skip("Postgres not reachable - skipping artifacts persistence check")

    ctx = _ctx(level=2)

    with patch("src.search.search", return_value=list(_CHUNKS)), \
         patch("src.llm.chat", return_value=iter(["본문 텍스트"])):
        artifact = generate_document("저장 확인용 문서", ctx=ctx, fmt="md")

    with _db.get_engine().connect() as conn:
        row = conn.execute(
            select(_db.artifacts).where(_db.artifacts.c.path == artifact.path)
        ).first()

    assert row is not None
    assert row.kind == "document"
    assert row.security_level == artifact.security_level
    assert list(row.source_ids) == list(artifact.source_ids)
    assert row.owner_id == ctx.principal.user_id
    assert row.project_id == ctx.membership.project_id
