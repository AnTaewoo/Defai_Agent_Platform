"""[P1] 유형별 문서 파서. 핵심 파싱은 직접 제어(LangChain 추상화 위임 금지)."""

from __future__ import annotations

from pathlib import Path

from ..types import ParsedDocument
from .docx import parse_docx
from .excel import parse_excel
from .pdf import parse_pdf
from .pptx import parse_pptx

_EXTENSION_PARSERS = {
    ".pdf": parse_pdf,
    ".xlsx": parse_excel,
    ".xlsm": parse_excel,
    ".pptx": parse_pptx,
    ".docx": parse_docx,
}


def parse(path: str) -> ParsedDocument:
    """파일 경로를 받아 표준 ParsedDocument로 변환.

    우선순위: PDF/Excel(MVP) -> PPT/Docs(완료) -> HWP/복잡한표/스캔본(공수 최대).
    확장자로 유형별 파서에 디스패치한다.
    """
    ext = Path(path).suffix.lower()
    parser = _EXTENSION_PARSERS.get(ext)
    if parser is None:
        raise NotImplementedError(f"P1: '{ext}' 파서 미구현 (PDF/Excel부터 지원)")
    return parser(path)
