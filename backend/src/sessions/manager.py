"""세션 열기·에이전트 선택·실행 전 재검증."""
from __future__ import annotations
import dataclasses
import uuid

from sqlalchemy import select

from ..types import Principal, SessionContext
from ..projects import _db, membership_of
from ..agents import available_agents


def open_session(principal: Principal, project_id: str) -> SessionContext:
    """유저가 특정 프로젝트로 세션을 연다. 멤버십 확인 후 SessionContext 생성.

    재진입 시 active_agent_id를 sessions 행에서 읽어 ctx를 복원한다(요청 간 일관).
    (user, project)당 가장 최근 세션 행을 찾고, 없으면 새로 만든다.
    """
    membership = membership_of(principal, project_id)  # 비멤버면 PermissionError

    with _db.get_engine().begin() as conn:
        row = conn.execute(
            select(_db.sessions.c.id, _db.sessions.c.active_agent_id)
            .where(
                _db.sessions.c.user_id == principal.user_id,
                _db.sessions.c.project_id == project_id,
            )
            .order_by(_db.sessions.c.created_at.desc())
        ).first()

        if row is None:
            session_id = uuid.uuid4().hex
            conn.execute(
                _db.sessions.insert().values(
                    id=session_id,
                    user_id=principal.user_id,
                    project_id=project_id,
                    active_agent_id=None,
                )
            )
            active_agent_id = None
        else:
            session_id, active_agent_id = row.id, row.active_agent_id

    return SessionContext(
        session_id=session_id,
        principal=principal,
        membership=membership,
        active_agent_id=active_agent_id,
    )


def select_agent(ctx: SessionContext, agent_id: str) -> SessionContext:
    """세션 안에서 활성 에이전트를 고른다. 가용 목록(available_agents) 밖이면 거부."""
    if agent_id not in available_agents(ctx):
        raise PermissionError("이 세션에서 허용되지 않은 에이전트")
    _persist_active_agent(ctx.session_id, agent_id)
    return dataclasses.replace(ctx, active_agent_id=agent_id)


def _persist_active_agent(session_id: str, agent_id: str) -> None:
    """sessions.active_agent_id UPDATE(요청 간 상태 보존)."""
    with _db.get_engine().begin() as conn:
        conn.execute(
            _db.sessions.update()
            .where(_db.sessions.c.id == session_id)
            .values(active_agent_id=agent_id)
        )


def require_live_agent(ctx: SessionContext) -> str:
    """실행 진입 경계에서 active_agent_id를 재검증(TOCTOU 방지).

    select_agent 이후 에이전트가 프로젝트에서 빠지거나 등급이 바뀌면 grant가 만료된다.
    워크플로우/챗 실행 직전에 이 함수로 재확인한다.
    """
    if ctx.active_agent_id is None:
        raise PermissionError("활성 에이전트 미선택")
    if ctx.active_agent_id not in available_agents(ctx):
        raise PermissionError("에이전트 가용성 만료(권한/등급 변경)")
    return ctx.active_agent_id
