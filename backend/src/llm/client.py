"""vLLM OpenAI 호환 엔드포인트 호출 클라이언트."""
from __future__ import annotations
from collections.abc import Iterator

from ..types import Principal
from .router import resolve_endpoint


def chat(messages: list[dict], *, principal: Principal, stream: bool = True) -> Iterator[str]:
    """vLLM의 OpenAI 호환 /v1/chat/completions 호출.

    stream=True면 토큰 단위로 yield. stream=False면 전체 텍스트를 단일 원소로 yield.
    """
    from openai import OpenAI  # 지연 임포트: 모듈 임포트 비용 최소화

    endpoint = resolve_endpoint(principal)
    client = OpenAI(base_url=endpoint.base_url, api_key="not-needed")

    if stream:
        response = client.chat.completions.create(
            model=endpoint.model, messages=messages, stream=True
        )

        def _gen() -> Iterator[str]:
            for chunk in response:
                delta = chunk.choices[0].delta.content
                if delta is not None:
                    yield delta

        return _gen()

    response = client.chat.completions.create(
        model=endpoint.model, messages=messages, stream=False
    )
    return iter([response.choices[0].message.content or ""])
