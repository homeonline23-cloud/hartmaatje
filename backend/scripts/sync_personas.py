#!/usr/bin/env python3
"""Sync per-persona JSON files from frontend productionCharacters.json."""

from __future__ import annotations

import json
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
SRC = BACKEND.parent / "src" / "lib" / "companion" / "productionCharacters.json"
OUT = BACKEND / "data" / "personas"


def main() -> int:
    if not SRC.is_file():
        print(f"Source not found: {SRC}", file=sys.stderr)
        return 1

    data = json.loads(SRC.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)

    catalog = {
        "version": data.get("version", "0"),
        "app": data.get("app", "Hartmaatje"),
        "language": data.get("language", "nl-NL"),
        "personas": [],
    }
    for char in data.get("characters", []):
        persona_id = char["id"]
        catalog["personas"].append(persona_id)
        (OUT / f"{persona_id}.json").write_text(
            json.dumps(char, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    (OUT / "catalog.json").write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Synced {len(catalog['personas'])} personas to {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
