"""[Phase 4] api/main.py 통합 테스트 — 인증 헤더 → SessionContext → 게이트①②③ → 워크플로우.

Postgres가 없으면(개발 인프라 미기동) 스킵한다 — tests/projects/test_membership_and_rbac.py와 동일 패턴.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.exc import OperationalError

from src.api.main import app
from src.projects import _db


@pytest.fixture(scope="module", autouse=True)
def _seeded_db():
    try:
        _db.ensure_schema()
        _db.seed_dummy_project()
    except OperationalError:
        pytest.skip("Postgres not reachable - skipping api integration tests")


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def _auth(user_id: str) -> dict:
    return {"X-Session-Token": f"sso-{user_id}"}


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_create_session_rejects_unknown_token(client):
    resp = client.post(
        "/sessions",
        json={"project_id": _db.DUMMY_PROJECT_ID},
        headers={"X-Session-Token": "not-a-real-token"},
    )
    assert resp.status_code == 401


def test_create_session_rejects_non_member_project(client):
    resp = client.post(
        "/sessions", json={"project_id": "proj-does-not-exist"}, headers=_auth("u-l2")
    )
    assert resp.status_code == 403


def test_create_session_returns_membership_and_available_agents(client):
    resp = client.post(
        "/sessions", json={"project_id": _db.DUMMY_PROJECT_ID}, headers=_auth("u-l5")
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["project_id"] == _db.DUMMY_PROJECT_ID
    assert body["role"] == "project_admin"
    # u-l5(L5)는 기본 에이전트(L5)를 가용 목록에서 본다.
    assert _db.DUMMY_AGENT_ID in body["available_agents"]


def test_select_session_agent_rejects_above_clearance(client):
    """u-l2(L2)는 기본 에이전트(L5)를 선택할 수 없다(가용 목록 밖 -> 403)."""
    created = client.post(
        "/sessions", json={"project_id": _db.DUMMY_PROJECT_ID}, headers=_auth("u-l2")
    ).json()
    resp = client.post(
        f"/sessions/{created['session_id']}/agent",
        json={"agent_id": _db.DUMMY_AGENT_ID},
        headers=_auth("u-l2"),
    )
    assert resp.status_code == 403


def test_select_session_agent_allows_at_clearance(client):
    created = client.post(
        "/sessions", json={"project_id": _db.DUMMY_PROJECT_ID}, headers=_auth("u-l5")
    ).json()
    resp = client.post(
        f"/sessions/{created['session_id']}/agent",
        json={"agent_id": _db.DUMMY_AGENT_ID},
        headers=_auth("u-l5"),
    )
    assert resp.status_code == 200
    assert resp.json()["active_agent_id"] == _db.DUMMY_AGENT_ID


# --- 데이터 게이트①②③ -------------------------------------------------------------


def test_list_project_data_filters_by_clearance_and_visibility(client):
    """u-l1(L1)은 data-1(L1·shared)만 본다 — data-2(L3)·data-3(L5·private)는 게이트②③에 막힌다."""
    resp = client.get(f"/projects/{_db.DUMMY_PROJECT_ID}/data", headers=_auth("u-l1"))
    assert resp.status_code == 200
    ids = {item["id"] for item in resp.json()}
    assert ids == {"data-1"}


def test_list_project_data_owner_sees_own_private_item(client):
    """u-l5는 data-3(L5·private)의 owner라 게이트③(owner_id==본인)을 통과해 전부 본다."""
    resp = client.get(f"/projects/{_db.DUMMY_PROJECT_ID}/data", headers=_auth("u-l5"))
    assert resp.status_code == 200
    ids = {item["id"] for item in resp.json()}
    assert ids == {"data-1", "data-2", "data-3"}


def test_list_project_data_non_owner_does_not_see_private_item(client):
    """u-l4(L4)는 등급은 충분(L4>=L1,L3)하지만 data-3(L5·private)은 등급②·소유③ 모두 막힌다."""
    resp = client.get(f"/projects/{_db.DUMMY_PROJECT_ID}/data", headers=_auth("u-l4"))
    assert resp.status_code == 200
    ids = {item["id"] for item in resp.json()}
    assert ids == {"data-1", "data-2"}


def test_list_library_data_matches_project_data_for_single_project_mvp(client):
    """단일 더미 프로젝트 MVP에서는 라이브러리(게이트②③)와 프로젝트 데이터(게이트①②③)가
    동일한 결과를 낸다(모든 라이브러리 데이터가 더미 프로젝트에 연결되어 있으므로)."""
    resp = client.get("/data", headers=_auth("u-l2"))
    assert resp.status_code == 200
    ids = {item["id"] for item in resp.json()}
    assert ids == {"data-1"}


# --- 채팅/워크플로우 ----------------------------------------------------------------


def test_chat_rejects_agent_above_clearance(client):
    resp = client.post(
        "/chat",
        json={"query": "테스트 질의", "agent_id": _db.DUMMY_AGENT_ID},
        headers=_auth("u-l2"),
    )
    assert resp.status_code == 403


def test_chat_with_available_agent_returns_answer_artifact(client):
    resp = client.post(
        "/chat",
        json={"query": "테스트 질의", "agent_id": _db.DUMMY_AGENT_ID},
        headers=_auth("u-l5"),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["kind"] == "answer"
    # fail-closed 불변식: 생성물 등급은 행위자 클리어런스 이상.
    assert body["security_level"] >= 5


def test_chat_writes_audit_log_entry(client):
    """data-model.md audit_log: 누가/어느 프로젝트·에이전트로/어떤 질의를 했는지 기록."""
    resp = client.post(
        "/chat",
        json={"query": "감사로그 테스트 질의", "agent_id": _db.DUMMY_AGENT_ID},
        headers=_auth("u-l5"),
    )
    assert resp.status_code == 200

    with _db.get_engine().connect() as conn:
        row = conn.execute(
            select(_db.audit_log)
            .where(
                _db.audit_log.c.user_id == "u-l5",
                _db.audit_log.c.action == "chat",
            )
            .order_by(_db.audit_log.c.id.desc())
            .limit(1)
        ).first()

    assert row is not None
    assert row.project_id == _db.DUMMY_PROJECT_ID
    assert row.agent_id == _db.DUMMY_AGENT_ID
    assert row.detail["query"] == "감사로그 테스트 질의"


# --- LLM 소스(읽기 전용) -------------------------------------------------------------


def test_llm_source_defaults_to_on_prem(client):
    resp = client.get("/llm/source", headers=_auth("u-l1"))
    assert resp.status_code == 200
    body = resp.json()
    assert body["mode"] == "on-prem"
    assert "vLLM" in body["provider"]
