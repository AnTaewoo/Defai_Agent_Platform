"""[P12] 코드 생성 + 샌드박스 실행.

generate_code/_sandbox_command은 인프라 없이 항상 통과해야 한다.
run_in_sandbox의 docker 통합 테스트는 docker/이미지 미가용(오프라인) 시 skip한다.
"""
from __future__ import annotations
import shutil
import subprocess
from unittest.mock import patch

import pytest

from src.codegen import (
    SandboxBroker,
    _build_stdin,
    _sandbox_command,
    generate_code,
    run_in_sandbox,
)
from src.types import Principal, ProjectMembership, SessionContext, classify_artifact


def _ctx(level: int = 3) -> SessionContext:
    return SessionContext(
        session_id="s1",
        principal=Principal(user_id="u1", level=level),
        membership=ProjectMembership(project_id="p1", role="member"),
    )


# ---------------------------------------------------------------------------
# generate_code
# ---------------------------------------------------------------------------


def test_generate_code_uses_llm_chat_and_classifies_with_actor_level():
    ctx = _ctx(level=3)
    fixed_code = "print('hello from llm')"

    with patch("src.llm.chat", return_value=iter([fixed_code])) as mock_chat:
        artifact = generate_code("write a hello world script", ctx=ctx, language="python")

    assert mock_chat.called
    _, kwargs = mock_chat.call_args
    assert kwargs["principal"] == ctx.principal
    assert kwargs["stream"] is False

    assert artifact.kind == "code"
    assert artifact.content == fixed_code
    assert artifact.source_ids == ()
    assert artifact.path is None
    assert artifact.security_level == classify_artifact(ctx)


def test_generate_code_falls_back_when_llm_unavailable():
    ctx = _ctx(level=2)
    spec = "write a hello world script"

    with patch("src.llm.chat", side_effect=ConnectionError("vLLM down")):
        artifact = generate_code(spec, ctx=ctx, language="python")

    assert artifact.kind == "code"
    assert artifact.content is not None
    assert "LLM unavailable" in artifact.content
    assert spec in artifact.content
    assert artifact.source_ids == ()
    assert artifact.security_level == classify_artifact(ctx)


# ---------------------------------------------------------------------------
# _sandbox_command (no docker required)
# ---------------------------------------------------------------------------


def test_sandbox_command_includes_isolation_flags():
    cmd = _sandbox_command(timeout_s=30)

    assert "docker" in cmd
    assert "run" in cmd

    assert "--network" in cmd
    assert cmd[cmd.index("--network") + 1] == "none"

    assert "--read-only" in cmd

    assert "-u" in cmd
    assert cmd[cmd.index("-u") + 1] == "65534:65534"

    assert "--tmpfs" in cmd
    assert cmd[cmd.index("--tmpfs") + 1] == "/scratch"

    assert "--memory=256m" in cmd
    assert "--cpus=1" in cmd

    # timeout 강제 종료 경로
    assert cmd[0] == "timeout"
    assert cmd[1] == "30s"


def test_build_stdin_without_context_returns_code_unchanged():
    code = "print('hi')"
    assert _build_stdin(code, []) == code


def test_build_stdin_with_context_prepends_dap_context_variable():
    code = "print(__DAP_CONTEXT__)"
    stdin = _build_stdin(code, ["doc-a", "doc-b"])

    assert stdin.startswith("__DAP_CONTEXT__ = ")
    assert "doc-a" in stdin
    assert "doc-b" in stdin
    assert stdin.endswith(code)


# ---------------------------------------------------------------------------
# run_in_sandbox (docker integration; skip if unavailable/offline)
# ---------------------------------------------------------------------------


def _docker_available() -> bool:
    if shutil.which("docker") is None:
        return False
    try:
        subprocess.run(
            ["docker", "info"], capture_output=True, text=True, timeout=10, check=True
        )
    except Exception:
        return False
    return True


def _ensure_image_or_skip(image: str = "python:3.11-slim") -> None:
    if not _docker_available():
        pytest.skip("docker not available")

    inspect = subprocess.run(
        ["docker", "image", "inspect", image], capture_output=True, text=True, timeout=10
    )
    if inspect.returncode == 0:
        return

    try:
        pull = subprocess.run(
            ["docker", "pull", image], capture_output=True, text=True, timeout=60
        )
    except subprocess.TimeoutExpired:
        pytest.skip(f"docker pull {image} timed out (offline?)")

    if pull.returncode != 0:
        pytest.skip(f"docker image {image} unavailable and pull failed (offline?)")


def test_run_in_sandbox_executes_code_and_captures_output():
    _ensure_image_or_skip()
    ctx = _ctx(level=2)

    result = run_in_sandbox("print('hello dap')", ctx=ctx, timeout_s=30)

    assert result.tool == "run_code"
    assert "hello dap" in result.output
    assert result.source_ids == ()
    assert result.security_level == classify_artifact(ctx)


def test_run_in_sandbox_blocks_egress():
    _ensure_image_or_skip()
    ctx = _ctx(level=2)

    code = (
        "import socket\n"
        "try:\n"
        "    socket.create_connection(('8.8.8.8', 53), timeout=2)\n"
        "    print('CONNECTED')\n"
        "except OSError as e:\n"
        "    print('BLOCKED', e)\n"
    )

    result = run_in_sandbox(code, ctx=ctx, timeout_s=30)

    assert "CONNECTED" not in result.output
    assert "BLOCKED" in result.output


class _FixedBroker:
    """더미 SandboxBroker: 고정 컨텍스트 텍스트 리스트를 반환."""

    def __init__(self, texts: list[str]):
        self._texts = texts

    def fetch_context(self, query: str, *, ctx: SessionContext) -> list[str]:
        return self._texts


def test_run_in_sandbox_injects_broker_context():
    _ensure_image_or_skip()
    ctx = _ctx(level=2)
    broker: SandboxBroker = _FixedBroker(["secret-context-value"])

    code = "print(__DAP_CONTEXT__)"

    result = run_in_sandbox(code, ctx=ctx, broker=broker, timeout_s=30)

    assert "secret-context-value" in result.output
    assert result.security_level == classify_artifact(ctx)
