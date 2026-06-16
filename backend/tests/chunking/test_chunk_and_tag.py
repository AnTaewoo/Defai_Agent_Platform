import pytest

from src.chunking import chunk_and_tag
from src.types import ParsedDocument


def _doc(**kwargs) -> ParsedDocument:
    defaults = dict(source="doc-1", doc_type="pdf", text_blocks=[], tables=[])
    defaults.update(kwargs)
    return ParsedDocument(**defaults)


def test_all_chunks_carry_complete_security_meta():
    doc = _doc(text_blocks=["첫 번째 문단", "두 번째 문단"], tables=[[["a", "b"], ["1", "2"]]])

    chunks = chunk_and_tag(doc, owner_id="u1", security_level=3, dept="기획", visibility="shared")

    assert len(chunks) == 3  # 2 text blocks + 1 table
    for chunk in chunks:
        meta = chunk.meta
        assert meta.security_level == 3
        assert meta.owner_id == "u1"
        assert meta.visibility == "shared"
        assert meta.dept == "기획"
        assert meta.source == "doc-1"
        assert meta.doc_type == "pdf"


def test_default_visibility_is_private():
    doc = _doc(text_blocks=["문단"])

    chunks = chunk_and_tag(doc, owner_id="u1", security_level=1, dept="기획")

    assert chunks[0].meta.visibility == "private"


def test_invalid_visibility_rejected():
    doc = _doc(text_blocks=["문단"])

    with pytest.raises(ValueError):
        chunk_and_tag(doc, owner_id="u1", security_level=1, dept="기획", visibility="public")


def test_long_paragraph_is_split_on_word_boundaries():
    long_text = " ".join(f"word{i}" for i in range(200))
    doc = _doc(text_blocks=[long_text])

    chunks = chunk_and_tag(doc, owner_id="u1", security_level=1, dept="기획", max_chars=50)

    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk.text) <= 50


def test_paragraphs_split_on_blank_lines():
    doc = _doc(text_blocks=["문단1\n\n문단2\n\n문단3"])

    chunks = chunk_and_tag(doc, owner_id="u1", security_level=1, dept="기획")

    assert [c.text for c in chunks] == ["문단1", "문단2", "문단3"]


def test_table_serialized_as_single_chunk():
    table = [["이름", "등급"], ["홍길동", "2"]]
    doc = _doc(tables=[table])

    chunks = chunk_and_tag(doc, owner_id="u1", security_level=1, dept="기획")

    assert len(chunks) == 1
    assert chunks[0].text == "이름 | 등급\n홍길동 | 2"


def test_data_id_overrides_source_as_join_key():
    # meta.source 는 검색 격리 조인키(data.id). data_id를 주면 그 값이 들어가야 한다.
    doc = _doc(source="/uploads/report.pdf", text_blocks=["문단"])

    tagged = chunk_and_tag(doc, owner_id="u1", security_level=1, dept="기획", data_id="data-42")
    assert tagged[0].meta.source == "data-42"

    # 미지정 시 MVP 편의로 원본 경로가 조인키 역할
    fallback = chunk_and_tag(doc, owner_id="u1", security_level=1, dept="기획")
    assert fallback[0].meta.source == "/uploads/report.pdf"
