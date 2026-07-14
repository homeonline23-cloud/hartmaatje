"""Safety guard foundation — modular rule-based checks."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List

from app.domain.models.persona import PersonaConfig
from app.schemas import AlertType, SafetyFlag
from app.services.safety.detector import SafetyResult, analyze_message

_DEPENDENCY = re.compile(
    r"(beloo(f|ft)|nooit\s+weg|alleen\s+(voor|van)\s+(mij|u|jou|me)|"
    r"(niet|kan\s+niet)\s+zonder\s+(u|jou|jullie|me)|"
    r"(bent|ben)\s+(u\s+)?mijn\s+(vriendin|vriend|geliefde|partner)|"
    r"altijd\s+(voor\s+)?(mij|u)|enige\s+die\s+(u|jou)\s+nodig)",
    re.IGNORECASE,
)

_POSSESSIVE = re.compile(
    r"(u\s+bent\s+van\s+mij|jij\s+bent\s+van\s+mij|you\s+are\s+mine|"
    r"alleen\s+van\s+mij|only\s+mine|mijn\s+enige)",
    re.IGNORECASE,
)

_MEDICAL_DIAGNOSIS = re.compile(
    r"(u\s+heeft\s+(waarschijnlijk|vast)|you\s+have\s+(probably|clearly)|"
    r"diagnose|u\s+bent\s+ziek\s+aan|het\s+is\s+zeker\s+dat\s+u)",
    re.IGNORECASE,
)

_MEDICATION_ADVICE = re.compile(
    r"(neem\s+\d+|take\s+\d+\s+(mg|pills?)|verhoog\s+de\s+dosering|"
    r"stop\s+met\s+uw\s+medicijn|increase\s+your\s+dose)",
    re.IGNORECASE,
)


@dataclass
class GuardResult:
    """Combined safety analysis for a turn."""

    flags: List[SafetyFlag] = field(default_factory=list)
    emergency_reply: str | None = None
    distress_reply: str | None = None
    medical_reply: str | None = None
    block_llm: bool = False
    reply_violations: list[str] = field(default_factory=list)

    @property
    def has_emergency(self) -> bool:
        return any(f.type == AlertType.emergency and f.triggered for f in self.flags)

    @property
    def has_distress(self) -> bool:
        return any(f.type == AlertType.distress and f.triggered for f in self.flags)


def analyze_user_message(text: str) -> GuardResult:
    """Pre-LLM safety on user input."""
    base: SafetyResult = analyze_message(text)
    flags = list(base.flags)

    if _DEPENDENCY.search(text):
        flags.append(
            SafetyFlag(
                type=AlertType.medical_boundary,
                triggered=True,
                message="Dependency language in user message",
            )
        )

    return GuardResult(
        flags=flags,
        emergency_reply=base.emergency_reply,
        distress_reply=base.distress_reply,
        medical_reply=base.medical_reply,
        block_llm=bool(base.emergency_reply or base.distress_reply or base.medical_reply),
    )


def check_reply(reply: str, persona: PersonaConfig) -> GuardResult:
    """Post-LLM safety on assistant output."""
    flags: list[SafetyFlag] = []
    violations: list[str] = []

    if _DEPENDENCY.search(reply):
        violations.append("dependency_language")
        flags.append(
            SafetyFlag(
                type=AlertType.medical_boundary,
                triggered=True,
                message="Dependency language in reply",
            )
        )

    if _POSSESSIVE.search(reply):
        violations.append("possessive_language")
        flags.append(
            SafetyFlag(
                type=AlertType.medical_boundary,
                triggered=True,
                message="Possessive language in reply",
            )
        )

    if _MEDICAL_DIAGNOSIS.search(reply):
        violations.append("medical_diagnosis")
        flags.append(
            SafetyFlag(
                type=AlertType.medical_boundary,
                triggered=True,
                message="Medical diagnosis in reply",
            )
        )

    if _MEDICATION_ADVICE.search(reply):
        violations.append("medication_advice")
        flags.append(
            SafetyFlag(
                type=AlertType.medical_boundary,
                triggered=True,
                message="Medication advice in reply",
            )
        )

    drift = _identity_drift(reply, persona)
    if drift:
        violations.append("identity_drift")
        flags.append(
            SafetyFlag(
                type=AlertType.medical_boundary,
                triggered=True,
                message=f"Identity drift: claims to be {drift}",
            )
        )

    return GuardResult(flags=flags, reply_violations=violations)


def _identity_drift(reply: str, persona: PersonaConfig) -> str | None:
    """Detect if reply claims a different companion name."""
    lowered = reply.lower()
    for other in ("fenna", "maarten", "peter", "colette"):
        if other == persona.id:
            continue
        patterns = (
            f"ik ben {other}",
            f"i am {other}",
            f"i'm {other}",
            f"hallo, ik ben {other}",
        )
        if any(p in lowered for p in patterns):
            return other
    return None
