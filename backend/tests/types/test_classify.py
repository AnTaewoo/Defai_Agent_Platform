"""[A2] 생성물 분류 단일 강제 — classify_artifact."""
from src.types import classify_artifact, Principal, ProjectMembership, SessionContext


def _ctx(level):
    return SessionContext(session_id="s", principal=Principal("u", level),
                          membership=ProjectMembership("p1", "member"))


def test_floor_is_actor_clearance_when_no_sources():
    assert classify_artifact(_ctx(4)) == 4              # 출처 0건 → 행위자 등급(과분류)


def test_max_of_sources_and_clearance():
    assert classify_artifact(_ctx(2), 5, 1) == 5        # 소스가 더 높으면 소스 max
    assert classify_artifact(_ctx(4), 1, 2) == 4        # 소스가 낮아도 행위자 바닥
