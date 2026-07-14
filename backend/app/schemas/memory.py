"""Resident memory schema."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class ResidentMemory(BaseModel):
    resident_id: str
    display_name: Optional[str] = None
    family: list[str] = Field(default_factory=list)
    pets: list[str] = Field(default_factory=list)
    hometown: Optional[str] = None
    hobbies: list[str] = Field(default_factory=list)
    favorite_music: list[str] = Field(default_factory=list)
    profession: Optional[str] = None
    preferences: list[str] = Field(default_factory=list)
    emotional_topics: list[str] = Field(default_factory=list)
    upcoming_visits: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    updated_at: Optional[datetime] = None

    def to_prompt_block(
        self,
        lang: Literal["nl", "en"] = "nl",
        session_summary: str = "",
    ) -> str:
        en = lang == "en"
        parts: list[str] = []
        if self.display_name:
            parts.append(f"Name: {self.display_name}" if en else f"Naam: {self.display_name}")
        if self.hometown:
            parts.append(
                f"Hometown: {self.hometown}" if en else f"Woonplaats/herkomst: {self.hometown}"
            )
        if self.family:
            parts.append(
                f"Family: {', '.join(self.family[-8:])}"
                if en
                else f"Familie: {', '.join(self.family[-8:])}"
            )
        if self.pets:
            parts.append(
                f"Pets: {', '.join(self.pets)}" if en else f"Huisdieren: {', '.join(self.pets)}"
            )
        if self.hobbies:
            parts.append(
                f"Hobbies: {', '.join(self.hobbies[-6:])}"
                if en
                else f"Hobby's: {', '.join(self.hobbies[-6:])}"
            )
        if self.favorite_music:
            parts.append(
                f"Music: {', '.join(self.favorite_music[-4:])}"
                if en
                else f"Muziek: {', '.join(self.favorite_music[-4:])}"
            )
        if self.profession:
            parts.append(
                f"Former work: {self.profession}" if en else f"Beroep (vroeger): {self.profession}"
            )
        if self.preferences:
            parts.append(
                f"Preferences: {', '.join(self.preferences[-6:])}"
                if en
                else f"Voorkeuren: {', '.join(self.preferences[-6:])}"
            )
        if self.emotional_topics:
            parts.append(
                f"Important feelings/topics: {', '.join(self.emotional_topics[-5:])}"
                if en
                else f"Belangrijke gevoelens/onderwerpen: {', '.join(self.emotional_topics[-5:])}"
            )
        if self.upcoming_visits:
            parts.append(
                f"Visits: {', '.join(self.upcoming_visits[-4:])}"
                if en
                else f"Bezoek: {', '.join(self.upcoming_visits[-4:])}"
            )
        if self.notes:
            parts.append(
                f"Recent notes: {'; '.join(self.notes[-4:])}"
                if en
                else f"Recente notities: {'; '.join(self.notes[-4:])}"
            )
        if session_summary:
            parts.append(
                f"This session so far: {session_summary}"
                if en
                else f"Dit gesprek tot nu toe: {session_summary}"
            )
        if not parts:
            return (
                "No stored memories yet."
                if en
                else "Nog geen opgeslagen herinneringen."
            )
        return "\n".join(parts)

