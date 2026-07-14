"""
Safety detection — MVP keyword rules.

Later: lightweight classifier model + human review queue.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List

from app.schemas import AlertType, SafetyFlag

_EMERGENCY = re.compile(
    r"(ge?vallen|val\s|onwel|pijn\s+op\s+de\s+borst|borstpijn|niet\s+ademen|"
    r"stik|bloed|112|ambulance|help\s+nu|direct\s+gevaar|ernstige\s+pijn|"
    r"kan\s+niet\s+opstaan)",
    re.IGNORECASE,
)

_DISTRESS = re.compile(
    r"(geen\s+zin\s+meer|wil\s+niet\s+meer|opgeven|hopeloos|niemand\s+heeft\s+me\s+nodig|"
    r"eenzaamheid\s+verdraag|zelfdoding|dood\s+gaan|niet\s+meer\s+leven)",
    re.IGNORECASE,
)

_MEDICAL = re.compile(
    r"(medicijn|pil|dosering|diagnose|bijwerking|behandeling|arts\s+zeggen)",
    re.IGNORECASE,
)


@dataclass
class SafetyResult:
    flags: List[SafetyFlag]
    emergency_reply: str | None = None
    distress_reply: str | None = None
    medical_reply: str | None = None

    @property
    def has_emergency(self) -> bool:
        return any(f.type == AlertType.emergency and f.triggered for f in self.flags)

    @property
    def has_distress(self) -> bool:
        return any(f.type == AlertType.distress and f.triggered for f in self.flags)


def analyze_message(text: str) -> SafetyResult:
    flags: list[SafetyFlag] = []
    emergency_reply = None
    distress_reply = None
    medical_reply = None

    if _EMERGENCY.search(text):
        flags.append(
            SafetyFlag(
                type=AlertType.emergency,
                triggered=True,
                message="Emergency keywords detected",
            )
        )
        emergency_reply = (
            "Ik ga meteen hulp voor u regelen, zodat iemand bij u kan komen kijken. "
            "Blijft u rustig zitten als dat kan."
        )

    if _DISTRESS.search(text):
        flags.append(
            SafetyFlag(
                type=AlertType.distress,
                triggered=True,
                message="Distress keywords detected",
            )
        )
        distress_reply = (
            "Ik ben echt blij dat u dat tegen mij zegt. U bent belangrijk. "
            "Ik wil dat iemand u steunt. Blijf even bij mij."
        )

    if _MEDICAL.search(text) and not emergency_reply:
        flags.append(
            SafetyFlag(
                type=AlertType.medical_boundary,
                triggered=True,
                message="Medical boundary",
            )
        )
        medical_reply = (
            "Ik wil dat u de beste zorg krijgt. "
            "Vraag dat alstublieft aan een verpleegkundige, arts of verzorger."
        )

    return SafetyResult(
        flags=flags,
        emergency_reply=emergency_reply,
        distress_reply=distress_reply,
        medical_reply=medical_reply,
    )
