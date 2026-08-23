"""[Phase 4] 업로드->연결->채팅 통합 테스트 — P1~P4 "한 줄기" 검증.

POST /data(파싱 P1 -> 청킹+태깅 P2 -> 색인 P3) -> POST /projects/{id}/data(게이트① 연결)
-> POST /chat(검색 P4 + 답변)까지 실제 OpenSearch/Postgres에 대해 한 번에 돈다.
인프라(Postgres/OpenSearch)가 없으면 skip한다(다른 통합 테스트와 동일 패턴).
"""
import pytest
from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas
from sqlalchemy.exc import OperationalError

from src import indexing
from src.api.main import _LIBRARY_DIR, app
from src.projects import _db


@pytest.fixture(scope="module", autouse=True)
def _seeded_db():
    try:
        _db.ensure_schema()
        _db.seed_dummy_project()
    except OperationalError:
        pytest.skip("Postgres not reachable - skipping ingest integration tests")
    if not indexing.get_client().ping():
        pytest.skip("OpenSearch not reachable - skipping ingest integration tests")


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def _auth(user_id: str) -> dict:
    return {"X-Session-Token": f"sso-{user_id}"}


def _make_pdf(path: str, text: str) -> str:
    c = canvas.Canvas(path, pagesize=(300, 300))
    c.drawString(50, 250, text)
    c.save()
    return path


def test_upload_attach_chat_round_trip(client, tmp_path):
    marker = "zephyrquasarseven77"
    pdf_path = _make_pdf(str(tmp_path / "sample.pdf"), f"D.A.P integration test {marker}")

    data_id = None
    try:
        # 1) POST /data: 파싱(P1) -> 청킹+태깅(P2) -> 색인(P3)
        with open(pdf_path, "rb") as f:
            resp = client.post(
                "/data",
                files={"file": ("sample.pdf", f, "application/pdf")},
                data={"security_level": "1", "visibility": "shared", "dept": "기획"},
                headers=_auth("u-l3"),
            )
        assert resp.status_code == 200
        body = resp.json()
        data_id = body["id"]
        assert body["index_status"] == "indexed"
        assert body["security_level"] == 1
        assert body["visibility"] == "shared"

        # 2) POST /projects/{id}/data: 게이트① 입력(project_data) 확장
        resp = client.post(
            f"/projects/{_db.DUMMY_PROJECT_ID}/data",
            json={"data_ids": [data_id]},
            headers=_auth("u-l3"),
        )
        assert resp.status_code == 200
        assert data_id in {item["id"] for item in resp.json()}

        # 3) POST /chat: 검색(P4)이 새 청크를 찾아 답변/출처에 반영하는지 확인
        resp = client.post(
            "/chat",
            json={"query": marker, "agent_id": _db.DUMMY_AGENT_ID},
            headers=_auth("u-l5"),
        )
        assert resp.status_code == 200
        artifact = resp.json()
        assert artifact["kind"] == "answer"
        assert data_id in artifact["source_ids"]
        assert marker in (artifact["content"] or "")
    finally:
        if data_id is not None:
            indexing.delete_by_source(data_id)
            with _db.get_engine().begin() as conn:
                conn.execute(
                    _db.project_data.delete().where(_db.project_data.c.data_id == data_id)
                )
                conn.execute(_db.data.delete().where(_db.data.c.id == data_id))
            for f in _LIBRARY_DIR.glob(f"{data_id}*"):
                f.unlink()
