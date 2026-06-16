"""[P11] 문서 생성. RAG 컨텍스트 + 템플릿 → docx/pdf/pptx/xlsx/md.

생성 문서는 classify_artifact(ctx, *근거 등급)로 등급을 상속(행위자 클리어런스 바닥).
포맷: python-docx / python-pptx / openpyxl / weasyprint(pdf). HWP 생성은 후순위.
"""
from .generator import generate_document
from .renderer import render_md, render_docx

__all__ = ["generate_document", "render_md", "render_docx"]
