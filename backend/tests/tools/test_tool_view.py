"""[3.4] 직렬화 가능한 ToolView 분리."""
from src.tools import Tool, ToolView


def test_view_drops_run_handle():
    t = Tool(name="search", description="검색", required_level=2, run=lambda **_: None)
    v = t.view()
    assert isinstance(v, ToolView)
    assert (v.name, v.required_level) == ("search", 2)
    assert not hasattr(v, "run")
