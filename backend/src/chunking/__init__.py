"""[P2] 청킹 + 보안 메타데이터 태깅 엔진.

project_id/agent_id는 청크에 태깅하지 않는다 — 프로젝트 스코프는 project_data(N:M, P13)로
별도 연결한다. 청크는 security_level/owner_id/visibility/dept/source/doc_type을 보유해야 한다.
"""
from .chunker import chunk_and_tag

__all__ = ["chunk_and_tag"]
