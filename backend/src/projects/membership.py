"""프로젝트 데이터 연결(N:M) 조회."""
from __future__ import annotations

from sqlalchemy import select

from ..types import SessionContext
from . import _db


def attached_source_ids(ctx: SessionContext) -> list[str]:
    """활성 프로젝트에 연결(attach)된 데이터의 식별자 목록 = project_data.data_id 집합.

    개정 모델: 청크엔 project_id가 없다 — project_data(N:M)가 라이브러리 데이터를 프로젝트에
    연결한다. 반환값은 청크 SecurityMeta.source와 동일 도메인(검색 격리 게이트 ①의 입력).
    """
    with _db.get_engine().connect() as conn:
        rows = conn.execute(
            select(_db.project_data.c.data_id).where(
                _db.project_data.c.project_id == ctx.membership.project_id
            )
        ).all()
    return [row.data_id for row in rows]
