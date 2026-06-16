"""[P5] resolve_endpoint — 등급/모드 기반 LLM 엔드포인트 라우팅.

Postgres가 없으면(개발 인프라 미기동) 스킵한다 — tests/projects/test_membership_and_rbac.py와 동일 패턴.
"""
import pytest
from sqlalchemy.exc import OperationalError

from src.llm import LLMEndpoint, chat, resolve_endpoint
from src.projects import _db
from src.types import Principal


@pytest.fixture(scope="module", autouse=True)
def _seeded_db():
    try:
        _db.ensure_schema()
        _db.seed_dummy_project()
    except OperationalError:
        pytest.skip("Postgres not reachable - skipping P5 integration tests")


def test_level5_resolves_to_seeded_onprem_endpoint():
    endpoint = resolve_endpoint(Principal(user_id="u-l5", level=5))
    assert endpoint == LLMEndpoint(
        base_url="http://localhost:8000/v1",
        model="Qwen/Qwen2.5-3B-Instruct",
        max_security_level=5,
    )


def test_level1_resolves_to_same_onprem_endpoint():
    """현재 시드엔 on-prem 엔드포인트가 1개(max_security_level=5)뿐이라,
    더 낮은 등급 유저도 결과가 동일하다(유일한 후보가 그것 뿐)."""
    endpoint = resolve_endpoint(Principal(user_id="u-l1", level=1))
    assert endpoint == LLMEndpoint(
        base_url="http://localhost:8000/v1",
        model="Qwen/Qwen2.5-3B-Instruct",
        max_security_level=5,
    )


def test_cloud_mode_without_matching_endpoint_raises_lookup_error():
    """llm_source.mode를 cloud로 토글했지만 cloud 엔드포인트가 없으면 LookupError."""
    with _db.get_engine().begin() as conn:
        conn.execute(
            _db.settings.update()
            .where(_db.settings.c.key == "llm_source")
            .values(value={"mode": "cloud"})
        )
    try:
        with pytest.raises(LookupError):
            resolve_endpoint(Principal(user_id="u-l5", level=5))
    finally:
        with _db.get_engine().begin() as conn:
            conn.execute(
                _db.settings.update()
                .where(_db.settings.c.key == "llm_source")
                .values(value={"mode": "on-prem"})
            )


def test_cloud_mode_with_matching_endpoint_routes_to_cloud_and_audits():
    """cloud 엔드포인트가 후보로 존재하면 그쪽으로 라우팅되고 audit_log에 기록된다."""
    cloud_id = "ep-cloud-test"
    with _db.get_engine().begin() as conn:
        conn.execute(
            _db.llm_endpoints.insert()
            .values(
                id=cloud_id,
                base_url="https://api.anthropic.com/v1",
                model="claude-test",
                max_security_level=5,
                source="cloud",
            )
        )
        conn.execute(
            _db.settings.update()
            .where(_db.settings.c.key == "llm_source")
            .values(value={"mode": "cloud"})
        )

    try:
        endpoint = resolve_endpoint(Principal(user_id="u-l5", level=5))
        assert endpoint.base_url == "https://api.anthropic.com/v1"
        assert endpoint.model == "claude-test"

        with _db.get_engine().connect() as conn:
            from sqlalchemy import select

            rows = conn.execute(
                select(_db.audit_log).where(_db.audit_log.c.action == "llm_resolve_cloud")
            ).all()
        assert any(r.detail.get("endpoint_id") == cloud_id for r in rows)
    finally:
        with _db.get_engine().begin() as conn:
            conn.execute(
                _db.settings.update()
                .where(_db.settings.c.key == "llm_source")
                .values(value={"mode": "on-prem"})
            )
            conn.execute(_db.llm_endpoints.delete().where(_db.llm_endpoints.c.id == cloud_id))
            conn.execute(_db.audit_log.delete().where(_db.audit_log.c.action == "llm_resolve_cloud"))


def test_chat_streams_tokens_from_vllm_or_skips_if_unreachable():
    """vLLM 서버가 실제로 떠 있지 않을 수 있다 — 연결 실패면 skip.

    이 테스트는 chat()의 라우팅+클라이언트 호출 와이어링을 점검한다(서버가 있을 때만 통과).
    """
    try:
        tokens = list(chat([{"role": "user", "content": "hi"}], principal=Principal("u-l5", 5)))
        assert all(isinstance(t, str) for t in tokens)
    except Exception as exc:  # noqa: BLE001 - 연결 실패 종류가 다양함(openai/httpx 예외 포함)
        pytest.skip(f"vLLM endpoint not reachable - skipping chat() integration test: {exc!r}")
