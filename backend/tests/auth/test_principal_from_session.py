"""[P6] 더미 SSO 세션 토큰 -> Principal 매핑 테스트.

Postgres가 없으면(개발 인프라 미기동) 스킵한다 — tests/projects의 스킵 패턴과 동일.
"""
import pytest
from sqlalchemy.exc import OperationalError

from src.auth import principal_from_session
from src.projects import _db
from src.types import Principal


@pytest.fixture(scope="module", autouse=True)
def _seeded_db():
    try:
        _db.ensure_schema()
        _db.seed_dummy_project()
    except OperationalError:
        pytest.skip("Postgres not reachable - skipping P6 integration tests")


def test_principal_from_session_maps_known_token():
    assert principal_from_session("sso-u-l3") == Principal(user_id="u-l3", level=3)


def test_principal_from_session_rejects_unknown_token():
    with pytest.raises(PermissionError):
        principal_from_session("sso-unknown")
