"""검색 권한 pre-filter. 3-게이트 filter 절 생성(post-filter 절대 금지)."""
from __future__ import annotations

from collections.abc import Sequence

from ..types import SessionContext

# OpenSearch terms 절 상한(index.max_terms_count 기본 65,536).
_MAX_INLINE_TERMS = 65_536


def build_access_filter(
    ctx: SessionContext, *, attached_source_ids: Sequence[str]
) -> list[dict]:
    """검색 권한 pre-filter의 단일 강제 지점. 3개 게이트를 OpenSearch filter 절로 생성.

    ① source ∈ attached_source_ids  (활성 프로젝트 project_data 연결 격리)
    ② security_level <= principal.level  (등급 클리어런스)
    ③ visibility=="shared" OR owner_id==본인  (가시성)
    """
    return [
        {"terms": {"source": list(attached_source_ids)}},
        {"range": {"security_level": {"lte": ctx.principal.level}}},
        {
            "bool": {
                "should": [
                    {"term": {"visibility": "shared"}},
                    {"term": {"owner_id": ctx.principal.user_id}},
                ],
                "minimum_should_match": 1,
            }
        },
    ]


def gate1_terms_lookup(ctx: SessionContext, *, project_data_index: str = "dap_project_data") -> dict:
    """게이트 ①(프로젝트 연결 격리)의 대규모 경로. 인라인 terms 상한(_MAX_INLINE_TERMS) 회피.

    수만 건 이상 연결 프로젝트용 — project_data를 OpenSearch에 미러링한 뒤 terms-lookup으로 참조.
    전제: project_data를 project_data_index에 동기화하는 Airflow DAG 필요.
    """
    return {
        "terms": {
            "source": {
                "index": project_data_index,
                "id": ctx.membership.project_id,
                "path": "data_ids",
            }
        }
    }
