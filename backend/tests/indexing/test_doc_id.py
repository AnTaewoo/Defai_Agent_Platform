"""[B2] 결정론적 색인 _id — 멱등성."""
from src.indexing import _doc_id


def test_doc_id_is_deterministic_and_per_source():
    assert _doc_id("d1", 0) == _doc_id("d1", 0)          # 재색인 = 동일 id(덮어쓰기)
    assert _doc_id("d1", 0) != _doc_id("d1", 1)          # 청크 서수 구분
    assert _doc_id("d1", 0) != _doc_id("d2", 0)          # 소스 구분
