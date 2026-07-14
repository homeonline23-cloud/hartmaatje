"""Postgres-backed resident memory repository."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from app.repositories.memory_repository import MemoryStore
from app.schemas import ResidentMemory


class PostgresMemoryStore(MemoryStore):
    def __init__(self, database_url: str) -> None:
        try:
            import psycopg
        except ImportError as exc:  # pragma: no cover - optional dependency
            raise RuntimeError(
                "Postgres memory backend requires psycopg. Install psycopg[binary]."
            ) from exc

        self._database_url = database_url
        self._psycopg = psycopg
        self._cache: dict[str, ResidentMemory] = {}
        self._init_db()

    def _connect(self):
        return self._psycopg.connect(self._database_url)

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS resident_memory (
                    resident_id TEXT PRIMARY KEY,
                    data JSONB NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL
                )
                """
            )
            conn.commit()

    def load(self, resident_id: str) -> ResidentMemory:
        if resident_id in self._cache:
            return self._cache[resident_id]
        with self._connect() as conn:
            row = conn.execute(
                "SELECT data FROM resident_memory WHERE resident_id = %s",
                (resident_id,),
            ).fetchone()
        if row:
            mem = ResidentMemory(**row[0])
        else:
            mem = ResidentMemory(resident_id=resident_id)
        self._cache[resident_id] = mem
        return mem

    def save(self, memory: ResidentMemory) -> None:
        memory.updated_at = datetime.now(timezone.utc)
        self._cache[memory.resident_id] = memory
        payload = json.loads(memory.model_dump_json())
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO resident_memory (resident_id, data, updated_at)
                VALUES (%s, %s::jsonb, %s)
                ON CONFLICT (resident_id) DO UPDATE SET
                    data = EXCLUDED.data,
                    updated_at = EXCLUDED.updated_at
                """,
                (memory.resident_id, json.dumps(payload), memory.updated_at),
            )
            conn.commit()
