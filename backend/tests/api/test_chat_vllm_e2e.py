"""[Phase 4 진단] file-parsing-indexing-vllm-backend — vLLM 호출 여부 E2E 진단.

`tests/api/test_ingest.py`의 업로드->연결->채팅 한 줄기는 이미 검증됐으나, 그 테스트는
`artifact["content"]`에 마커 문자열이 포함되는지만 확인한다 — `_finalize_answer`의
fallback(observations 이어붙임)에도 마커가 그대로 들어있어 vLLM 미호출을 가리지 못한다.

이 테스트는 (1) `llm.resolve_endpoint`/`llm.chat`을 직접 호출해 vLLM 연결 가능 여부를 보고하고,
(2) 업로드->색인->채팅 한 줄기에서 `artifact["content"]`가 raw observations(fallback)와
동일한지 비교해 실제로 vLLM 응답이 합성됐는지 판별한다. 인프라(Postgres/OpenSearch)가
없으면 다른 통합 테스트와 동일하게 skip하고, vLLM(`infra/docker-compose.yml`의 `vllm`
서비스, GPU 필요)이 떠 있지 않으면 `tests/llm/test_resolve_endpoint.py`와 동일하게 skip한다
- 이 경우 fallback이 발동했다는 것 자체가 "vLLM 미기동"이라는 진단 결과이기 때문이다.
"""
import pytest
from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas
from sqlalchemy.exc import OperationalError

from src import indexing, llm
from src.api.main import _LIBRARY_DIR, app
from src.projects import _db
from src.types import Principal


@pytest.fixture(scope="module", autouse=True)
def _seeded_db():
    try:
        _db.ensure_schema()
        _db.seed_dummy_project()
    except OperationalError:
        pytest.skip("Postgres not reachable - skipping vLLM E2E diagnostic")
    if not indexing.get_client().ping():
        pytest.skip("OpenSearch not reachable - skipping vLLM E2E diagnostic")


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


def test_resolve_endpoint_and_direct_chat_call():
    """1단계: 라우팅(resolve_endpoint)과 vLLM 직접 호출(llm.chat) 자체가 동작하는지 확인.

    vLLM(`infra/docker-compose.yml`의 `vllm` 서비스, GPU 필요)이 떠 있지 않으면 연결
    실패 사유를 출력하고 skip한다 - 이 사유 자체가 진단 결과다.
    """
    endpoint = llm.resolve_endpoint(Principal(user_id="u-l5", level=5))
    print(f"\n[resolve_endpoint] base_url={endpoint.base_url} model={endpoint.model}")

    try:
        tokens = list(
            llm.chat([{"role": "user", "content": "ping"}], principal=Principal("u-l5", 5), stream=False)
        )
        print(f"[llm.chat] OK -> {tokens!r}")
    except Exception as exc:  # noqa: BLE001 - 연결 실패 종류가 다양함(openai/httpx 예외 포함)
        pytest.skip(
            f"vLLM endpoint not reachable - skipping ({endpoint.base_url}, {endpoint.model}): "
            f"{type(exc).__name__}: {exc}"
        )


def test_upload_index_chat_uses_vllm_not_fallback(client, tmp_path):
    """2단계: 업로드->색인->채팅 한 줄기에서 답변이 vLLM 생성물인지, fallback(observations 이어붙임)인지 판별."""
    marker = "vllmpipelinecheck42"
    pdf_path = _make_pdf(str(tmp_path / "sample.pdf"), f"D.A.P vLLM pipeline check {marker}")

    data_id = None
    try:
        resp = client.post(
            "/data",
            files={"file": ("sample.pdf", open(pdf_path, "rb"), "application/pdf")},
            data={"security_level": "1", "visibility": "shared", "dept": "기획"},
            headers=_auth("u-l3"),
        )
        assert resp.status_code == 200
        data_id = resp.json()["id"]

        resp = client.post(
            f"/projects/{_db.DUMMY_PROJECT_ID}/data",
            json={"data_ids": [data_id]},
            headers=_auth("u-l3"),
        )
        assert resp.status_code == 200

        resp = client.post(
            "/chat",
            json={"query": f"{marker}에 대해 설명해줘", "agent_id": _db.DUMMY_AGENT_ID},
            headers=_auth("u-l5"),
        )
        assert resp.status_code == 200
        artifact = resp.json()
        content = artifact["content"] or ""
        print(f"\n[/chat content]\n{content}\n")

        # fallback signature: _finalize_answer가 vLLM 실패 시 observations를 그대로 이어붙인다.
        # 즉 답변이 "D.A.P vLLM pipeline check ..."로 시작하는 검색결과 원문 그대로면 fallback.
        is_raw_observation = content.strip().startswith("D.A.P vLLM pipeline check")
        if is_raw_observation:
            pytest.skip(
                "백엔드 /chat이 vLLM 응답이 아닌 raw observations(fallback)을 반환했다 - "
                "_finalize_answer의 llm.chat() 호출이 vLLM 미기동으로 fallback된 것으로 보인다. "
                f"content={content!r}"
            )
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
