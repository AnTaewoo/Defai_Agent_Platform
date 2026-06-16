import pytest

from src import indexing
from src.types import Chunk, SecurityMeta

TEST_INDEX = "dap_chunks_test"


@pytest.fixture(scope="module")
def client():
    c = indexing.get_client()
    if not c.ping():
        pytest.skip("OpenSearch not reachable - skipping indexing integration tests")
    return c


@pytest.fixture(autouse=True)
def _use_test_index(monkeypatch, client):
    monkeypatch.setattr(indexing, "INDEX_NAME", TEST_INDEX)
    yield
    if client.indices.exists(index=TEST_INDEX):
        client.indices.delete(index=TEST_INDEX)


def _chunk(text: str, **meta_overrides) -> Chunk:
    meta = dict(
        security_level=1,
        dept="기획",
        source="doc-1",
        doc_type="pdf",
        owner_id="u1",
        visibility="shared",
    )
    meta.update(meta_overrides)
    return Chunk(text=text, meta=SecurityMeta(**meta))


def test_ensure_index_creates_mapping(client):
    indexing.ensure_index(client)

    mapping = client.indices.get_mapping(index=TEST_INDEX)[TEST_INDEX]["mappings"]["properties"]
    assert mapping["embedding"]["type"] == "knn_vector"
    assert mapping["embedding"]["dimension"] == indexing.EMBEDDING_DIM
    assert mapping["security_level"]["type"] == "integer"
    assert mapping["owner_id"]["type"] == "keyword"
    assert mapping["visibility"]["type"] == "keyword"
    assert mapping["dept"]["type"] == "keyword"
    assert mapping["source"]["type"] == "keyword"
    assert mapping["doc_type"]["type"] == "keyword"


def test_index_chunks_generates_embedding_and_filters_by_security_level(client):
    indexing.ensure_index(client)

    chunks = [
        _chunk("공개 가능한 문단", security_level=1, owner_id="alice", visibility="shared"),
        _chunk("기밀 문단", security_level=5, owner_id="bob", visibility="private"),
    ]
    indexing.index_chunks(chunks, client)

    docs = client.search(index=TEST_INDEX, body={"query": {"match_all": {}}})["hits"]["hits"]
    assert len(docs) == 2
    for doc in docs:
        assert len(doc["_source"]["embedding"]) == indexing.EMBEDDING_DIM

    resp = client.search(
        index=TEST_INDEX,
        body={"query": {"bool": {"filter": [{"range": {"security_level": {"lte": 1}}}]}}},
    )
    hits = resp["hits"]["hits"]
    assert len(hits) == 1
    assert hits[0]["_source"]["content"] == "공개 가능한 문단"
