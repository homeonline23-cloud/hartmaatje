"""Tests for calendar and care-notes tools."""

import pytest

from app.domain.models.dialogue import ResponsePlan
from app.services.tools.calendar_tool import wants_calendar
from app.services.tools.care_notes_tool import wants_care_notes
from app.services.tools.tool_service import apply_tools


def test_wants_calendar() -> None:
    assert wants_calendar("Wanneer komt mijn dochter op bezoek?")


def test_wants_care_notes() -> None:
    assert wants_care_notes("Kun je de zorgnotities even voorlezen?")


@pytest.mark.asyncio
async def test_apply_tools_calendar() -> None:
    plan = ResponsePlan(intent="practical_question", tool_action="calendar")
    updated = await apply_tools(
        plan,
        "Wat staat er op mijn agenda voor bezoek?",
        "nl",
        resident_id="guest",
    )
    assert updated.tool_action == "calendar"
    assert isinstance(updated.tool_used, bool)


@pytest.mark.asyncio
async def test_apply_tools_care_notes() -> None:
    plan = ResponsePlan(intent="practical_question", tool_action="care_notes")
    updated = await apply_tools(
        plan,
        "Zijn er zorgnotities over medicatie?",
        "nl",
        resident_id="guest",
    )
    assert updated.tool_action == "care_notes"
    assert isinstance(updated.tool_context, str)
