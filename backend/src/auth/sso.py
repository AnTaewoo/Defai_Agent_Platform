"""SSO/LDAP 세션 토큰 → Principal 변환."""
from __future__ import annotations

from sqlalchemy import select

from ..projects import _db
from ..types import Principal


def principal_from_session(session_token: str) -> Principal:
    """SSO/LDAP 세션 -> Principal.

    MVP 더미 매핑: session_token을 users.sso_subject와 매칭해 Principal을 만든다.
    실제 SSO/LDAP 연동은 P6 후속 — 여기선 더미 토큰->Principal 매핑만 수행.
    """
    with _db.get_engine().connect() as conn:
        row = conn.execute(
            select(_db.users.c.id, _db.users.c.level).where(
                _db.users.c.sso_subject == session_token
            )
        ).first()
    if row is None:
        raise PermissionError(f"유효하지 않은 세션 토큰: {session_token}")
    return Principal(user_id=row.id, level=row.level)
