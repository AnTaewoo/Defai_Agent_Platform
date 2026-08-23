"""LLM 등급→엔드포인트 라우팅."""
from __future__ import annotations
from dataclasses import dataclass

from sqlalchemy import select

from ..types import Principal
from ..projects import _db


@dataclass(frozen=True)
class LLMEndpoint:
    """등급에 매핑되는 vLLM 서빙 엔드포인트."""
    base_url: str
    model: str
    max_security_level: int


def resolve_endpoint(principal: Principal) -> LLMEndpoint:
    """유저 등급에 허용된 LLM 엔드포인트를 반환.

    기본 모드(on-prem)에선 사내 vLLM만 후보. cloud 토글 시에만 외부 엔드포인트가 후보(audit).
    선택 규칙: mode == endpoint.source 중 max_security_level >= principal.level인 최소 엔드포인트.
    """
    with _db.get_engine().connect() as conn:
        row = conn.execute(
            select(_db.settings.c.value).where(_db.settings.c.key == "llm_source")
        ).first()
    mode = (row.value.get("mode") if row is not None else None) or "on-prem"

    with _db.get_engine().connect() as conn:
        candidate = conn.execute(
            select(_db.llm_endpoints)
            .where(
                _db.llm_endpoints.c.source == mode,
                _db.llm_endpoints.c.max_security_level >= principal.level,
            )
            .order_by(_db.llm_endpoints.c.max_security_level.asc())
            .limit(1)
        ).first()

    if candidate is None:
        raise LookupError(
            f"등급 {principal.level}에 맞는 LLM 엔드포인트가 없음 (mode={mode!r})"
        )

    if mode == "cloud":
        with _db.get_engine().begin() as conn:
            conn.execute(
                _db.audit_log.insert().values(
                    user_id=principal.user_id,
                    project_id=None,
                    agent_id=None,
                    action="llm_resolve_cloud",
                    detail={"endpoint_id": candidate.id, "level": principal.level},
                )
            )

    return LLMEndpoint(
        base_url=candidate.base_url,
        model=candidate.model,
        max_security_level=candidate.max_security_level,
    )
