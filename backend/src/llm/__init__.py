"""[P5] LLM 서빙 클라이언트 — 사내 vLLM(OpenAI 호환 엔드포인트) 기본.

기본값은 사내 vLLM(망분리). 외부 클라우드 LLM은 admin 전역 토글로만 활성화(절대원칙 6).
임베딩은 항상 local(ML Commons). 등급 → 엔드포인트 라우팅(llm_endpoints).
"""
from .router import LLMEndpoint, resolve_endpoint
from .client import chat

__all__ = ["LLMEndpoint", "resolve_endpoint", "chat"]
