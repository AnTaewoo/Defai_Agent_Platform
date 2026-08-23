"""OpenSearch ML Commons 임베딩 모델 등록·배포."""
from __future__ import annotations

import hashlib
import time
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from opensearchpy import OpenSearch

from .client import MODEL_GROUP_NAME, EMBEDDING_MODEL_NAME, EMBEDDING_MODEL_VERSION, get_client

_TASK_POLL_INTERVAL_SEC = 2
_TASK_POLL_TIMEOUT_SEC = 120


def get_embedding_model_id(client: "OpenSearch | None" = None) -> str:
    """배포된 임베딩 모델의 model_id를 반환(idempotent 등록·배포 포함).

    search 모듈이 neural 쿼리(neural.embedding.model_id)에 쓰는 공개 진입점.
    """
    client = client or get_client()
    return _ensure_embedding_model(client)


def _ensure_embedding_model(client: "OpenSearch") -> str:
    """임베딩 모델 그룹/모델을 등록·배포하고 배포된 model_id를 반환(idempotent)."""
    _ensure_ml_commons_dev_settings(client)
    group_id = _ensure_model_group(client)

    search_resp = client.transport.perform_request(
        "POST",
        "/_plugins/_ml/models/_search",
        body={
            "query": {
                "bool": {
                    "must": [
                        {"term": {"name.keyword": EMBEDDING_MODEL_NAME}},
                        {"term": {"model_group_id": group_id}},
                        {"term": {"model_state": "DEPLOYED"}},
                    ]
                }
            }
        },
    )
    hits = search_resp.get("hits", {}).get("hits", [])
    if hits:
        return hits[0]["_id"]

    register_resp = client.transport.perform_request(
        "POST",
        "/_plugins/_ml/models/_register",
        body={
            "name": EMBEDDING_MODEL_NAME,
            "version": EMBEDDING_MODEL_VERSION,
            "model_group_id": group_id,
            "model_format": "TORCH_SCRIPT",
        },
    )
    model_id = _wait_for_task(client, register_resp["task_id"])["model_id"]

    deploy_resp = client.transport.perform_request(
        "POST", f"/_plugins/_ml/models/{model_id}/_deploy"
    )
    _wait_for_task(client, deploy_resp["task_id"])

    return model_id


def _ensure_model_group(client: "OpenSearch") -> str:
    search_resp = client.transport.perform_request(
        "POST",
        "/_plugins/_ml/model_groups/_search",
        body={"query": {"term": {"name.keyword": MODEL_GROUP_NAME}}},
    )
    hits = search_resp.get("hits", {}).get("hits", [])
    if hits:
        return hits[0]["_id"]

    create_resp = client.transport.perform_request(
        "POST",
        "/_plugins/_ml/model_groups/_register",
        body={"name": MODEL_GROUP_NAME, "description": "D.A.P 임베딩 모델 그룹"},
    )
    return create_resp["model_group_id"]


def _ensure_ml_commons_dev_settings(client: "OpenSearch") -> None:
    """단일 노드 개발 클러스터용 ML Commons 설정(idempotent).

    native_memory_threshold 상향: 개발 머신에서 OS 페이지캐시로 인한 메모리 서킷브레이커 방지.
    운영(ML 노드 분리) 환경에서는 불필요.
    """
    client.cluster.put_settings(
        body={
            "persistent": {
                "plugins.ml_commons.only_run_on_ml_node": "false",
                "plugins.ml_commons.native_memory_threshold": "100",
            }
        }
    )


def _wait_for_task(client: "OpenSearch", task_id: str) -> dict:
    deadline = time.monotonic() + _TASK_POLL_TIMEOUT_SEC
    while time.monotonic() < deadline:
        task = client.transport.perform_request("GET", f"/_plugins/_ml/tasks/{task_id}")
        state = task.get("state")
        if state == "COMPLETED":
            return task
        if state == "FAILED":
            raise RuntimeError(f"ML Commons task {task_id} failed: {task}")
        time.sleep(_TASK_POLL_INTERVAL_SEC)
    raise TimeoutError(f"ML Commons task {task_id} timed out")


def doc_id(source: str, ordinal: int) -> str:
    """결정론적 청크 문서 _id = sha1(source:ordinal). 재색인 멱등성의 핵심."""
    return hashlib.sha1(f"{source}:{ordinal}".encode()).hexdigest()
