"""vLLM 기반 코드 생성(실행 없음)."""
from __future__ import annotations

from ..types import SessionContext, Artifact, classify_artifact


def generate_code(spec: str, *, ctx: SessionContext, language: str = "python") -> Artifact:
    """spec으로 코드 생성(실행 안 함). 등급은 컨텍스트에서 전파(소스 없음, fail-closed).

    vLLM 미가용 시 실패시키지 않고 스텁 코드로 대체해 계속 진행.
    """
    from ..llm import chat  # 지연 임포트: 순환/임포트 비용 회피

    messages = [
        {
            "role": "system",
            "content": (
                f"You are a code generation assistant. Generate {language} code only. "
                "Output only the code itself, with no explanations and no markdown fences."
            ),
        },
        {"role": "user", "content": spec},
    ]

    try:
        content = "".join(chat(messages, principal=ctx.principal, stream=False))
    except Exception:
        content = f"# LLM unavailable - spec: {spec}\n# language: {language}\n"

    return Artifact(
        kind="code",
        security_level=classify_artifact(ctx),
        source_ids=(),
        path=None,
        content=content,
    )
