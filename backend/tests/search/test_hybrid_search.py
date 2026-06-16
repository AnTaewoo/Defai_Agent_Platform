"""[P4] 하이브리드 검색(BM25 + neural/k-NN, RRF 결합) 통합 테스트.

청크를 색인한 뒤 다양한 SessionContext/attached_source_ids 조합으로 search()를 호출해
build_access_filter의 3중 게이트(① 연결 source, ② security_level, ③ visibility/owner)가
질의 단계(pre-filter)에서 실제로 강제되는지 확인한다. OpenSearch가 없으면 skip한다.
"""
import pytest

from src import indexing
from src.search import search
from src.types import Chunk, Principal, ProjectMembership, SecurityMeta, SessionContext

TEST_INDEX = "dap_chunks_search_test"


@pytest.fixture(scope="module")
def client():
    c = indexing.get_client()
    if not c.ping():
        pytest.skip("OpenSearch not reachable - skipping search integration tests")
    return c


@pytest.fixture(autouse=True)
def _use_test_index(monkeypatch, client):
    monkeypatch.setattr(indexing, "INDEX_NAME", TEST_INDEX)
    # search 모듈은 INDEX_NAME을 `from ..indexing import INDEX_NAME`로 자체 네임스페이스에
    # 바인딩했으므로, search 모듈 쪽 참조도 함께 패치해야 한다.
    monkeypatch.setattr("src.search.INDEX_NAME", TEST_INDEX)

    if client.indices.exists(index=TEST_INDEX):
        client.indices.delete(index=TEST_INDEX)
    indexing.ensure_index(client)

    yield

    if client.indices.exists(index=TEST_INDEX):
        client.indices.delete(index=TEST_INDEX)


def _ctx(level: int = 3, user_id: str = "alice", project_id: str = "proj-1") -> SessionContext:
    return SessionContext(
        session_id="s1",
        principal=Principal(user_id=user_id, level=level),
        membership=ProjectMembership(project_id=project_id, role="member"),
    )


def _chunk(text: str, **meta_overrides) -> Chunk:
    meta = dict(
        security_level=1,
        dept="기획",
        source="doc-1",
        doc_type="pdf",
        owner_id="alice",
        visibility="shared",
    )
    meta.update(meta_overrides)
    return Chunk(text=text, meta=SecurityMeta(**meta))


@pytest.fixture
def indexed_chunks(client):
    chunks = [
        # 누구나(레벨 1) 접근 가능, doc-1, alice 공유
        _chunk(
            "인공지능 기술 동향 분석 보고서",
            security_level=1, source="doc-1", owner_id="alice", visibility="shared",
        ),
        # 등급 5(기밀), doc-2, bob 공유 -> level 3 사용자에게는 보이지 않아야 함
        _chunk(
            "인공지능 기밀 연구 계획서",
            security_level=5, source="doc-2", owner_id="bob", visibility="shared",
        ),
        # 등급 1, doc-3(프로젝트에 연결되지 않음), alice 공유 -> source 게이트로 배제
        _chunk(
            "인공지능 미연결 문서 내용",
            security_level=1, source="doc-3", owner_id="alice", visibility="shared",
        ),
        # 등급 1, doc-1, bob 개인소유(private) -> alice에게는 보이지 않아야 함
        _chunk(
            "인공지능 비공개 개인 메모",
            security_level=1, source="doc-1", owner_id="bob", visibility="private",
        ),
        # 등급 1, doc-1, alice 개인소유(private) -> alice 본인에게는 보여야 함
        _chunk(
            "인공지능 알리스 개인 메모",
            security_level=1, source="doc-1", owner_id="alice", visibility="private",
        ),
    ]
    indexing.index_chunks(chunks, client)
    return chunks


def test_search_excludes_unattached_sources(indexed_chunks):
    # doc-1만 프로젝트에 연결됨 -> doc-2/doc-3 청크는 결과에서 배제
    ctx = _ctx(level=10, user_id="alice")
    results = search("인공지능", ctx=ctx, attached_source_ids=["doc-1"], k=10)

    sources = {r.meta.source for r in results}
    assert sources == {"doc-1"}
    assert all(r.meta.source != "doc-2" for r in results)
    assert all(r.meta.source != "doc-3" for r in results)


def test_search_excludes_above_principal_level(indexed_chunks):
    # doc-2(level 5)도 연결되어 있지만, alice의 클리어런스(level 3)를 넘어서므로 배제
    ctx = _ctx(level=3, user_id="alice")
    results = search("인공지능", ctx=ctx, attached_source_ids=["doc-1", "doc-2"], k=10)

    levels = {r.meta.security_level for r in results}
    assert all(level <= 3 for level in levels)
    assert all(r.meta.source != "doc-2" for r in results)


def test_search_private_visible_only_to_owner(indexed_chunks):
    ctx_alice = _ctx(level=10, user_id="alice")
    ctx_carol = _ctx(level=10, user_id="carol")

    results_alice = search("개인 메모", ctx=ctx_alice, attached_source_ids=["doc-1"], k=10)
    texts_alice = {r.text for r in results_alice}
    assert "인공지능 알리스 개인 메모" in texts_alice          # 본인 소유 private -> 노출
    assert "인공지능 비공개 개인 메모" not in texts_alice       # 타인 소유 private -> 비노출

    results_carol = search("개인 메모", ctx=ctx_carol, attached_source_ids=["doc-1"], k=10)
    texts_carol = {r.text for r in results_carol}
    assert "인공지능 알리스 개인 메모" not in texts_carol       # carol 소유 아님 -> 비노출
    assert "인공지능 비공개 개인 메모" not in texts_carol       # carol 소유 아님 -> 비노출


def test_search_no_attached_sources_returns_empty(indexed_chunks):
    ctx = _ctx(level=10, user_id="alice")
    results = search("인공지능", ctx=ctx, attached_source_ids=[], k=10)
    assert results == []


def test_search_returns_chunk_instances_with_security_meta(indexed_chunks):
    ctx = _ctx(level=10, user_id="alice")
    results = search("인공지능 기술 동향", ctx=ctx, attached_source_ids=["doc-1"], k=10)

    assert results, "기대 결과가 있어야 한다"
    for r in results:
        assert isinstance(r, Chunk)
        assert r.embedding is None
        assert r.meta.source == "doc-1"
        assert r.meta.security_level == 1
