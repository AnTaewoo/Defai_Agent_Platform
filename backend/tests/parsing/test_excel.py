from openpyxl import Workbook

from src.parsing import parse
from src.parsing.excel import parse_excel


def _make_xlsx(path: str) -> str:
    wb = Workbook()
    ws = wb.active
    ws.title = "Sheet1"
    ws.append(["이름", "부서", "등급"])
    ws.append(["홍길동", "기획", 2])
    wb.save(path)
    return path


def test_parse_excel_produces_table_and_text_block(tmp_path):
    path = _make_xlsx(str(tmp_path / "sample.xlsx"))

    doc = parse_excel(path)

    assert doc.doc_type == "xlsx"
    assert doc.source == path
    assert "# Sheet1" in doc.text_blocks
    assert doc.tables == [[["이름", "부서", "등급"], ["홍길동", "기획", "2"]]]


def test_parse_dispatches_xlsx_by_extension(tmp_path):
    path = _make_xlsx(str(tmp_path / "sample.xlsx"))

    doc = parse(path)

    assert doc.doc_type == "xlsx"
