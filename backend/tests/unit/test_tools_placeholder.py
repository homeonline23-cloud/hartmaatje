"""Tests for tool layer."""

import pytest

from app.domain.models.dialogue import ResponsePlan
from app.services.tools.tool_service import apply_tools
from app.services.tools.web_search_tool import wants_web_search


def test_wants_web_search() -> None:
    assert wants_web_search("Kun je opzoeken wat het weer morgen wordt?")


@pytest.mark.asyncio
async def test_apply_tools_research_candidate() -> None:
    plan = ResponsePlan(intent="research_candidate", tool_action="research")
    updated = await apply_tools(plan, "wat is het weer morgen in Amsterdam", "nl")
    assert updated.tool_action == "research"
    assert isinstance(updated.tool_used, bool)
