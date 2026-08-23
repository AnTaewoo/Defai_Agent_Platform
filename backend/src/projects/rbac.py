"""프로젝트 역할 기반 RBAC."""
from __future__ import annotations

from sqlalchemy import select

from ..types import Principal, ProjectMembership, SessionContext
from . import _db

# 역할 계층(누적). docs/projects-rbac.md §3: project_admin > manager > editor > member > viewer.
_ROLE_RANK: dict[str, int] = {
    "viewer": 0,
    "member": 1,
    "editor": 2,
    "manager": 3,
    "project_admin": 4,
}

# 액션 -> 필요한 최소 역할(누적). 등급(level)과 역할(role)은 직교.
_ACTION_MIN_ROLE: dict[str, str] = {
    "view": "viewer",
    "attach_data": "member",
    "edit_config": "editor",
    "manage_members": "manager",
    "manage_agents": "project_admin",
    "manage_project": "project_admin",
}


def membership_of(principal: Principal, project_id: str) -> ProjectMembership:
    """유저의 해당 프로젝트 멤버십(역할) 조회. 비멤버면 PermissionError."""
    with _db.get_engine().connect() as conn:
        row = conn.execute(
            select(_db.project_members.c.role).where(
                _db.project_members.c.project_id == project_id,
                _db.project_members.c.user_id == principal.user_id,
            )
        ).first()
    if row is None:
        raise PermissionError(f"{principal.user_id}는 프로젝트 {project_id}의 멤버가 아닙니다")
    return ProjectMembership(project_id=project_id, role=row.role)


def can(ctx: SessionContext, action: str) -> bool:
    """프로젝트 역할 기반 RBAC 체크.

    계층(누적): project_admin > manager > editor > member > viewer.
    등급(level)과 역할(role)은 직교 — 여기선 역할만 본다.
    """
    try:
        min_role = _ACTION_MIN_ROLE[action]
    except KeyError:
        raise ValueError(f"알 수 없는 액션: {action!r}") from None
    return _ROLE_RANK[ctx.membership.role] >= _ROLE_RANK[min_role]


def add_project_agent(ctx: SessionContext, agent_id: str, agent_security_level: int) -> None:
    """프로젝트 생성자가 프로젝트에 에이전트를 지정(편입).

    1) 클리어런스: agent_security_level <= ctx.principal.level
    2) 역할: project_admin (can(ctx, 'manage_agents'))
    """
    if agent_security_level > ctx.principal.level:
        raise PermissionError("자기 등급 위 에이전트는 프로젝트에 편입 불가")
    if not can(ctx, "manage_agents"):
        raise PermissionError("에이전트 편입은 project_admin만 가능")
    with _db.get_engine().begin() as conn:
        conn.execute(
            _db.agents.update()
            .where(_db.agents.c.id == agent_id)
            .values(project_id=ctx.membership.project_id)
        )
