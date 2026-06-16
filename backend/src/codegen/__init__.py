"""[P12] 코드 생성 + 샌드박스 실행.

코드 실행은 반드시 격리 샌드박스에서: egress 0, non-root, read-only FS(절대원칙 7).
생성 코드/실행결과는 classify_artifact(ctx)로 등급을 받는다(fail-closed).
"""
from .generator import generate_code
from .sandbox import SandboxBroker, run_in_sandbox

__all__ = ["generate_code", "SandboxBroker", "run_in_sandbox"]
