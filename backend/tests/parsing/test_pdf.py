from reportlab.pdfgen import canvas

from src.parsing import parse
from src.parsing.pdf import parse_pdf


def _make_pdf(path: str) -> str:
    c = canvas.Canvas(path, pagesize=(300, 300))
    c.drawString(50, 250, "Hello D.A.P")
    c.save()
    return path


def test_parse_pdf_extracts_text(tmp_path):
    path = _make_pdf(str(tmp_path / "sample.pdf"))

    doc = parse_pdf(path)

    assert doc.doc_type == "pdf"
    assert doc.source == path
    assert any("Hello D.A.P" in block for block in doc.text_blocks)


def test_parse_dispatches_pdf_by_extension(tmp_path):
    path = _make_pdf(str(tmp_path / "sample.pdf"))

    doc = parse(path)

    assert doc.doc_type == "pdf"
