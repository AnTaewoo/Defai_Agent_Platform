"""[P1] PDF 파서. pdfplumber로 직접 제어 — LangChain 로더 위임 금지."""

from __future__ import annotations

import pdfplumber

from ..types import ParsedDocument


def parse_pdf(path: str) -> ParsedDocument:
    """PDF 파일을 ParsedDocument로 변환.

    페이지별 추출 텍스트를 text_blocks에 담고, 페이지 내 표는 pdfplumber의
    표 추출(extract_tables)로 별도 보존한다. 스캔본(텍스트 레이어 없음)은
    text_blocks가 비어있을 수 있다 — OCR 경로는 MVP 이후 별도 처리.
    """
    text_blocks: list[str] = []
    tables: list[list[list[str]]] = []

    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            if text.strip():
                text_blocks.append(text.strip())

            for table in page.extract_tables():
                rows = [["" if cell is None else str(cell) for cell in row] for row in table]
                if rows:
                    tables.append(rows)

    return ParsedDocument(
        source=path,
        doc_type="pdf",
        text_blocks=text_blocks,
        tables=tables,
    )
