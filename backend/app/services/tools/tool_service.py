"""Tool service — invoked by orchestrator / response planning, not LLM."""

from __future__ import annotations

from typing import Literal

from app.domain.models.dialogue import ResponsePlan
from app.services.tools.tool_router import route_tool

AppLang = Literal["nl", "en"]


async def apply_tools(
    plan: ResponsePlan,
    query: str,
    lang: AppLang = "nl",
    *,
    resident_id: str = "guest",
) -> ResponsePlan:
    """
    Run tools requested by the response plan and attach context.

    Called after response planning, before prompt building / LLM.
    """
    if not plan.tool_action:
        return plan

    context, used = await route_tool(
        plan.tool_action,
        query,
        lang,
        resident_id=resident_id,
    )
    return plan.model_copy(
        update={
            "tool_context": context,
            "tool_used": used,
        }
    )
