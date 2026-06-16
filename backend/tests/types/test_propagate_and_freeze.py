"""[A1] 등급 전파 fail-closed + 보안 DTO 동결."""
import dataclasses
import pytest
from src.types import propagate_level, SecurityMeta, Artifact


def test_floor_when_no_sources():
    assert propagate_level() == 1                 # 소스 0건 → 0이 아니라 floor(L1)


def test_max_with_floor():
    assert propagate_level(3) == 3
    assert propagate_level(2, floor=4) == 4        # 행위자 클리어런스 바닥
    assert propagate_level(5, 2, floor=3) == 5     # 소스 max가 floor보다 높으면 max


def test_security_meta_is_frozen():
    m = SecurityMeta(security_level=3, dept="기획", source="d1",
                     doc_type="pdf", owner_id="u1", visibility="shared")
    with pytest.raises(dataclasses.FrozenInstanceError):
        m.security_level = 1                       # 분류 등급 변조 차단


def test_artifact_is_frozen():
    a = Artifact(kind="answer", security_level=4, source_ids=("d1",))
    with pytest.raises(dataclasses.FrozenInstanceError):
        a.security_level = 1
