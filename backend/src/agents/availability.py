"""에이전트 가용 판정."""
from __future__ import annotations

from sqlalchemy import select

from ..types import SessionContext
from ..projects import _db


def available_agents(ctx: SessionContext) -> list[str]:
    """이 세션에서 유저가 쓸 수 있는 에이전트 id 목록.

    = 프로젝트가 보유한 에이전트(생성자가 지정) ∩ {등급 <= principal.level}.
    유저별 수동 허용 목록은 없다 — 에이전트 등급이 유저 클리어런스 이하면 자동 가용.
    """
    with _db.get_engine().connect() as conn:
        rows = conn.execute(
            select(_db.agents.c.id).where(
                _db.agents.c.project_id == ctx.membership.project_id,
                _db.agents.c.security_level <= ctx.principal.level,
            )
        ).all()
    return [row.id for row in rows]
