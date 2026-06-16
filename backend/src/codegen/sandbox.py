"""격리 샌드박스 실행. egress 0, non-root, read-only FS(절대원칙 7)."""
from __future__ import annotations
import subprocess
from typing import Protocol

from ..types import SessionContext, ToolResult, classify_artifact


class SandboxBroker(Protocol):
    """샌드박스가 외부 자원에 닿는 유일한 좁은 중개 계약.

    샌드박스는 OpenSearch/Postgres/vLLM/MinIO에 직접 접근하지 않는다(egress 0).
    필요한 데이터는 이 브로커를 통해서만, ctx의 권한 필터를 거친 결과만 받는다.
    """

    def fetch_context(self, query: str, *, ctx: SessionContext) -> list[str]:
        """권한 필터된 근거 텍스트만 반환(원본 커넥션·자격증명은 넘기지 않는다)."""
        ...


def _sandbox_command(timeout_s: int) -> list[str]:
    """격리 docker run 커맨드 구성(순수 함수 — docker 미실행으로도 단위 테스트 가능).

    egress 0(--network none), non-root(-u 65534), read-only FS + /scratch, CPU/메모리/시간 제한.
    """
    return [
        "timeout", f"{timeout_s}s",
        "docker", "run", "--rm", "-i",
        "--network", "none",
        "--read-only",
        "--tmpfs", "/scratch",
        "-u", "65534:65534",
        "--memory=256m",
        "--cpus=1",
        "python:3.11-slim",
        "python3", "-",
    ]


def _build_stdin(code: str, context_texts: list[str]) -> str:
    """컨테이너 stdin으로 보낼 소스. broker 컨텍스트를 __DAP_CONTEXT__ 변수로 prepend."""
    if not context_texts:
        return code
    return f"__DAP_CONTEXT__ = {context_texts!r}\n{code}"


def run_in_sandbox(
    code: str, *, ctx: SessionContext, broker: SandboxBroker | None = None, timeout_s: int = 30
) -> ToolResult:
    """생성/제출 코드를 격리 컨테이너에서 실행.

    불변식: egress 0, 외부 데이터스토어 직접 접근 0, 권한 상승 0.
    외부 자원이 필요하면 broker를 통해서만: 컨테이너 기동 전 호스트가 미리 가져와 stdin에 주입.
    """
    context_texts: list[str] = []
    if broker is not None:
        context_texts = broker.fetch_context(code, ctx=ctx)

    stdin_payload = _build_stdin(code, context_texts)
    cmd = _sandbox_command(timeout_s)

    try:
        proc = subprocess.run(
            cmd, input=stdin_payload, capture_output=True, text=True, timeout=timeout_s + 5
        )
        output = proc.stdout + proc.stderr
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout or ""
        stderr = exc.stderr or ""
        if isinstance(stdout, bytes):
            stdout = stdout.decode(errors="replace")
        if isinstance(stderr, bytes):
            stderr = stderr.decode(errors="replace")
        output = f"{stdout}{stderr}\n[sandbox] timed out after {timeout_s}s"

    return ToolResult(
        tool="run_code",
        security_level=classify_artifact(ctx),
        output=output,
        source_ids=(),
    )
