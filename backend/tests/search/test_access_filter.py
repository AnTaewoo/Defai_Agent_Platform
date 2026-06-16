"""[P4] 검색 권한 격리 테스트 — build_access_filter가 3중 게이트를 정확히 생성하는지.

이 테스트는 '권한 pre-filter의 단일 강제 지점'(build_access_filter)이 데이터모델의 3항
filter를 그대로 만들고, 부서(dept)를 게이트로 쓰지 않으며, 미연결(project_data 밖) 데이터를
배제함을 검증한다. build_access_filter 관련 테스트는 OpenSearch 없이 순수 로직만 확인한다.
search() 호출 테스트는 OpenSearch가 필요하므로 reachable하지 않으면 skip한다.
"""
import pytest

from src.indexing import get_client
from src.search import build_access_filter, search
from src.types import Principal, ProjectMembership, SessionContext


def _ctx(level: int = 3, user_id: str = "alice", project_id: str = "proj-1") -> SessionContext:
    return SessionContext(
        session_id="s1",
        principal=Principal(user_id=user_id, level=level),
        membership=ProjectMembership(project_id=project_id, role="member"),
    )


def test_filter_has_exactly_three_gates():
    f = build_access_filter(_ctx(), attached_source_ids=["d1", "d2"])
    assert len(f) == 3


def test_gate1_isolates_to_attached_sources():
    f = build_access_filter(_ctx(), attached_source_ids=["d1", "d2"])
    assert f[0] == {"terms": {"source": ["d1", "d2"]}}


def test_gate2_clamps_to_principal_level():
    f = build_access_filter(_ctx(level=3), attached_source_ids=["d1"])
    assert f[1] == {"range": {"security_level": {"lte": 3}}}


def test_gate3_visibility_is_shared_or_own():
    f = build_access_filter(_ctx(user_id="alice"), attached_source_ids=["d1"])
    should = f[2]["bool"]["should"]
    assert {"term": {"visibility": "shared"}} in should
    assert {"term": {"owner_id": "alice"}} in should
    assert f[2]["bool"]["minimum_should_match"] == 1


def test_dept_is_never_a_gate():
    f = build_access_filter(_ctx(), attached_source_ids=["d1"])
    assert "dept" not in repr(f)


def test_no_attached_data_matches_nothing():
    # 미연결 프로젝트: source terms가 비어 어떤 청크도 통과하지 못한다(미연결 노출 0).
    f = build_access_filter(_ctx(), attached_source_ids=[])
    assert f[0] == {"terms": {"source": []}}


def test_search_rejects_missing_ctx_without_opensearch():
    # ctx 없이 검색 호출 불가(타입 강제) — OpenSearch 연결 전에 TypeError로 즉시 실패한다.
    with pytest.raises(TypeError):
        search("q", attached_source_ids=["d1"])  # type: ignore[call-arg]


def test_search_requires_ctx_keyword_only():
    if not get_client().ping():
        pytest.skip("OpenSearch not reachable - skipping search integration test")

    with pytest.raises(TypeError):
        search("q", attached_source_ids=["d1"])  # type: ignore[call-arg]

    # ctx를 키워드로 넘기면 정상 동작한다 — 빈 인덱스/빈 attached_source_ids에서도
    # 예외 없이 빈 결과를 반환한다(권한 필터는 내부에서 강제 주입됨).
    result = search("q", ctx=_ctx(), attached_source_ids=["d1"])
    assert result == []
