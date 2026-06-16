"""BM25 + k-NN 하이브리드 검색 + RRF 융합."""
from __future__ import annotations

from collections.abc import Sequence

from ..indexing import INDEX_NAME, get_client, get_embedding_model_id
from ..types import Chunk, SecurityMeta, SessionContext
from .filters import build_access_filter

# RRF(Reciprocal Rank Fusion) 상수. 클수록 하위 랭크 문서 기여가 평탄화된다.
_RRF_K = 60

# 각 채널(BM25/벡터)에서 RRF 융합을 위해 가져올 후보 수의 배수.
_CANDIDATE_MULTIPLIER = 4


def _chunk_from_hit(hit: dict) -> Chunk:
    """OpenSearch hit `_source`를 Chunk(meta=SecurityMeta(...))로 복원. embedding은 None."""
    src = hit["_source"]
    meta = SecurityMeta(
        security_level=src["security_level"],
        dept=src["dept"],
        source=src["source"],
        doc_type=src["doc_type"],
        owner_id=src["owner_id"],
        visibility=src["visibility"],
    )
    return Chunk(text=src["content"], meta=meta, embedding=None, summary=src.get("summary", ""))


def _rrf_fuse(
    ranked_hit_lists: Sequence[list[dict]], *, k: int, rrf_k: int = _RRF_K
) -> list[Chunk]:
    """여러 랭킹 결과를 RRF(Reciprocal Rank Fusion)로 합쳐 상위 k개의 Chunk를 반환.

    score(doc) = sum over lists( 1 / (rrf_k + rank) ), rank는 1부터 시작.
    동일 _id가 여러 리스트에 등장하면 점수를 합산한다.
    """
    scores: dict[str, float] = {}
    hits_by_id: dict[str, dict] = {}
    for hit_list in ranked_hit_lists:
        for rank, hit in enumerate(hit_list, start=1):
            doc_id = hit["_id"]
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (rrf_k + rank)
            hits_by_id.setdefault(doc_id, hit)

    ranked_ids = sorted(scores, key=lambda doc_id: scores[doc_id], reverse=True)
    return [_chunk_from_hit(hits_by_id[doc_id]) for doc_id in ranked_ids[:k]]


def search(
    query: str,
    *,
    ctx: SessionContext,
    attached_source_ids: Sequence[str],
    k: int = 8,
) -> list[Chunk]:
    """BM25 + k-NN(neural) 하이브리드 검색, RRF로 결합.

    ctx(SessionContext)는 키워드-온리 필수 — 이것 없이는 검색이 호출될 수 없다(타입 강제).
    권한 게이트는 build_access_filter로 질의 전에 두 쿼리 모두의 filter 절에 주입(post-filter 금지).
    """
    access_filter = build_access_filter(ctx, attached_source_ids=attached_source_ids)
    client = get_client()
    candidate_size = max(k * _CANDIDATE_MULTIPLIER, k)

    if not client.indices.exists(index=INDEX_NAME):
        return []

    bm25_body = {
        "size": candidate_size,
        "_source": True,
        "query": {
            "bool": {
                "must": [{"match": {"content": query}}],
                "filter": access_filter,
            }
        },
    }
    bm25_hits = client.search(index=INDEX_NAME, body=bm25_body)["hits"]["hits"]

    model_id = get_embedding_model_id(client)
    neural_body = {
        "size": candidate_size,
        "_source": True,
        "query": {
            "bool": {
                "must": [
                    {
                        "neural": {
                            "embedding": {
                                "query_text": query,
                                "model_id": model_id,
                                "k": candidate_size,
                            }
                        }
                    }
                ],
                "filter": access_filter,
            }
        },
    }
    neural_hits = client.search(index=INDEX_NAME, body=neural_body)["hits"]["hits"]

    return _rrf_fuse([bm25_hits, neural_hits], k=k)
