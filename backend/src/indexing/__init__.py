"""[P3] OpenSearch 인덱싱. BM25 매핑 + knn_vector + 메타 필터 필드. 별도 벡터DB 없음.

임베딩은 OpenSearch ML Commons의 text_embedding 인제스트 파이프라인으로 생성(절대원칙 2).
ensure_index()가 모델 등록·배포와 파이프라인/인덱스 생성을 모두 idempotent하게 보장한다.
"""
from .client import (
    INDEX_NAME,
    PIPELINE_NAME,
    MODEL_GROUP_NAME,
    EMBEDDING_MODEL_NAME,
    EMBEDDING_MODEL_VERSION,
    EMBEDDING_DIM,
    get_client,
)
from .ml_commons import get_embedding_model_id
from .pipeline import ensure_index, index_chunks, delete_by_source

__all__ = [
    "INDEX_NAME",
    "PIPELINE_NAME",
    "MODEL_GROUP_NAME",
    "EMBEDDING_MODEL_NAME",
    "EMBEDDING_MODEL_VERSION",
    "EMBEDDING_DIM",
    "get_client",
    "get_embedding_model_id",
    "ensure_index",
    "index_chunks",
    "delete_by_source",
]
