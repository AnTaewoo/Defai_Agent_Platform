"""OpenSearch 클라이언트 + 인덱스 상수·매핑 정의."""
from __future__ import annotations

import os
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from opensearchpy import OpenSearch

INDEX_NAME = "dap_chunks"
PIPELINE_NAME = "dap_embedding_pipeline"
MODEL_GROUP_NAME = "dap_embedding_models"
EMBEDDING_MODEL_NAME = "huggingface/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
EMBEDDING_MODEL_VERSION = "1.0.1"
EMBEDDING_DIM = 384

_INDEX_BODY = {
    "settings": {
        "index.knn": True,
        "default_pipeline": PIPELINE_NAME,
        # 한국어 형태소 분석. 'analysis-nori' 플러그인 필요(infra: 커스텀 OpenSearch 이미지).
        "analysis": {
            "tokenizer": {
                "ko_nori": {"type": "nori_tokenizer", "decompound_mode": "mixed"},
            },
            "analyzer": {
                "ko": {
                    "type": "custom",
                    "tokenizer": "ko_nori",
                    "filter": ["nori_part_of_speech", "lowercase"],
                },
            },
        },
    },
    "mappings": {
        "properties": {
            "content": {"type": "text", "analyzer": "ko"},
            "embedding": {
                "type": "knn_vector",
                "dimension": EMBEDDING_DIM,
                "method": {"name": "hnsw", "space_type": "cosinesimil", "engine": "lucene"},
            },
            "security_level": {"type": "integer"},
            "owner_id": {"type": "keyword"},
            "visibility": {"type": "keyword"},
            "dept": {"type": "keyword"},
            "source": {"type": "keyword"},
            "doc_type": {"type": "keyword"},
            "summary": {"type": "text", "index": False},
        }
    },
}


def get_client() -> "OpenSearch":
    """개발용 OpenSearch 클라이언트(보안 플러그인 비활성화 가정)."""
    from opensearchpy import OpenSearch
    host = os.environ.get("OPENSEARCH_HOST", "localhost")
    port = int(os.environ.get("OPENSEARCH_PORT", "9200"))
    return OpenSearch(
        hosts=[{"host": host, "port": port}],
        http_compress=True,
        use_ssl=False,
        verify_certs=False,
    )
