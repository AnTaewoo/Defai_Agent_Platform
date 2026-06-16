"""인덱스 생성 + 청크 색인 + 삭제."""
from __future__ import annotations

from dataclasses import asdict
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from opensearchpy import OpenSearch

from ..types import Chunk, SecurityMeta
from .client import INDEX_NAME, PIPELINE_NAME, _INDEX_BODY, get_client
from .ml_commons import _ensure_embedding_model, doc_id


def ensure_index(client: "OpenSearch | None" = None) -> None:
    """인덱스 + 임베딩 파이프라인 생성(이미 있으면 스킵).

    1) ML Commons 임베딩 모델 등록·배포(idempotent) → model_id
    2) model_id로 text_embedding 인제스트 파이프라인 생성/갱신
    3) content(text) + embedding(knn_vector) + 보안 메타 필드로 인덱스 생성
    """
    client = client or get_client()

    model_id = _ensure_embedding_model(client)

    client.ingest.put_pipeline(
        id=PIPELINE_NAME,
        body={
            "description": "D.A.P 청크 임베딩 파이프라인 (ML Commons text_embedding)",
            "processors": [
                {
                    "text_embedding": {
                        "model_id": model_id,
                        "field_map": {"content": "embedding"},
                    }
                }
            ],
        },
    )

    if not client.indices.exists(index=INDEX_NAME):
        client.indices.create(index=INDEX_NAME, body=_INDEX_BODY)
    else:
        # 기존 인덱스에 summary 필드가 없으면 mapping 추가(idempotent).
        client.indices.put_mapping(
            index=INDEX_NAME,
            body={"properties": {"summary": {"type": "text", "index": False}}},
        )


def index_chunks(
    chunks: list[Chunk],
    client: "OpenSearch | None" = None,
    *,
    immediate: bool = True,
) -> int:
    """청크를 색인. embedding은 default_pipeline(text_embedding)이 content로부터 생성한다.

    멱등성: _id = sha1(source:ordinal) 결정론적 upsert. 재색인=덮어쓰기, 재시도=무해.
    계약: 한 문서(source)의 전체 청크를 한 번의 호출로 넘긴다.
    immediate=True(기본): refresh='wait_for' — 업로드 즉시 검색 가능.
    immediate=False: refresh=False — 대량 백필용(Airflow DAG).
    """
    from opensearchpy.helpers import bulk
    client = client or get_client()

    ordinals: dict[str, int] = {}
    actions = []
    for chunk in chunks:
        src = chunk.meta.source
        i = ordinals[src] = ordinals.get(src, -1) + 1
        actions.append(
            {
                "_index": INDEX_NAME,
                "_id": doc_id(src, i),
                "_source": {
                    "content": chunk.text,
                    "summary": chunk.summary,
                    **asdict(chunk.meta),
                },
            }
        )
    success, errors = bulk(
        client,
        actions,
        refresh=("wait_for" if immediate else False),
        raise_on_error=False,
        stats_only=False,
    )
    if errors:
        raise RuntimeError(f"색인 실패 {len(errors)}건 (예: {errors[:3]})")
    return success


def delete_by_source(source: str, client: "OpenSearch | None" = None) -> None:
    """한 문서(source)의 모든 청크를 삭제. 문서 갱신 시 재적재 전에 호출(스테일 청크 제거)."""
    client = client or get_client()
    client.delete_by_query(
        index=INDEX_NAME,
        body={"query": {"term": {"source": source}}},
        refresh=True,
    )


def _chunk_from_hit(hit: dict) -> Chunk:
    src = hit["_source"]
    meta = SecurityMeta(
        security_level=src["security_level"],
        dept=src.get("dept", ""),
        source=src["source"],
        doc_type=src.get("doc_type", ""),
        owner_id=src.get("owner_id", ""),
        visibility=src.get("visibility", "shared"),
    )
    return Chunk(text=src["content"], meta=meta, summary=src.get("summary", ""))


def list_chunks(source: str, client: "OpenSearch | None" = None, *, max_chunks: int = 500) -> list[Chunk]:
    """한 데이터(source=data_id)의 모든 청크를 순서대로 반환. 데이터 상세 화면용."""
    client = client or get_client()
    if not client.indices.exists(index=INDEX_NAME):
        return []
    body = {
        "size": max_chunks,
        "_source": True,
        "query": {"term": {"source": source}},
        "sort": [{"_id": "asc"}],
    }
    hits = client.search(index=INDEX_NAME, body=body)["hits"]["hits"]
    return [_chunk_from_hit(hit) for hit in hits]
