"""SQLite memory repository tests."""

from app.repositories.sqlite_memory_repository import SqliteMemoryStore
from app.schemas import ResidentMemory


def test_sqlite_memory_roundtrip(tmp_path) -> None:
    store = SqliteMemoryStore(str(tmp_path / "memory.db"))
    mem = ResidentMemory(resident_id="jan", display_name="Jan", family=["dochter Marie"])
    store.save(mem)
    loaded = store.load("jan")
    assert loaded.display_name == "Jan"
    assert "dochter Marie" in loaded.family
