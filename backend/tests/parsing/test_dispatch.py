import pytest

from src.parsing import parse


def test_parse_raises_for_unsupported_extension(tmp_path):
    path = tmp_path / "sample.hwp"
    path.write_text("dummy")

    with pytest.raises(NotImplementedError):
        parse(str(path))
