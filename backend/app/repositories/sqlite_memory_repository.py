"""SQLite-backed resident memory repository."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from app.repositories.memory_repository import MemoryStore
from app.schemas import ResidentMemory


class SqliteMemoryStore(MemoryStore):
    def __init__(self, db_path: str) -> None:
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._cache: dict[str, ResidentMemory] = {}
        self._init_db()

    def _init_db(self) -> None:
        with sqlite3.connect(self._db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS resident_memory (
                    resident_id TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )

    def load(self, resident_id: str) -> ResidentMemory:
        if resident_id in self._cache:
            return self._cache[resident_id]
        with sqlite3.connect(self._db_path) as conn:
            row = conn.execute(
                "SELECT data FROM resident_memory WHERE resident_id = ?",
                (resident_id,),
            ).fetchone()
        if row:
            mem = ResidentMemory(**json.loads(row[0]))
        else:
            mem = ResidentMemory(resident_id=resident_id)
        self._cache[resident_id] = mem
        return mem

    def save(self, memory: ResidentMemory) -> None:
        memory.updated_at = datetime.now(timezone.utc)
        self._cache[memory.resident_id] = memory
        payload = memory.model_dump_json()
        with sqlite3.connect(self._db_path) as conn:
            conn.execute(
                """
                INSERT INTO resident_memory (resident_id, data, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(resident_id) DO UPDATE SET
                    data = excluded.data,
                    updated_at = excluded.updated_at
                """,
                (memory.resident_id, payload, memory.updated_at.isoformat()),
            )
