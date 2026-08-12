"""Tests for the Session helper that tracks Q&A rhythm."""

from app.services.chat.session_manager import Session


def _session() -> Session:
    return Session(session_id="s1", resident_id="r1", display_name=None, lang="nl")


def test_no_turns_means_no_recent_question() -> None:
    session = _session()
    assert session.last_assistant_asked_question() is False


def test_detects_question_in_last_assistant_turn() -> None:
    session = _session()
    session.add_turn("user", "Hallo.")
    session.add_turn("assistant", "Hallo, fijn dat u er bent. Hoe was uw ochtend?")
    assert session.last_assistant_asked_question() is True


def test_ignores_older_turns_once_a_statement_follows() -> None:
    session = _session()
    session.add_turn("user", "Hallo.")
    session.add_turn("assistant", "Hallo, fijn dat u er bent. Hoe was uw ochtend?")
    session.add_turn("user", "Heel rustig.")
    session.add_turn("assistant", "Dat klinkt fijn, rustig is een mooi begin van de dag.")
    assert session.last_assistant_asked_question() is False
