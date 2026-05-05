"""Tests for status-transition logic on cards."""
from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

from app.api.cards import apply_status_transition
from app.enums import CardStatus


def _stub_card(status: CardStatus, moved: int = 0, completed: datetime | None = None):
    """Use SimpleNamespace so we don't need to instantiate the ORM model
    (which requires a Postgres connection)."""
    return SimpleNamespace(
        status=status,
        moved_count=moved,
        completed_at=completed,
    )


def test_no_status_change_is_a_no_op():
    card = _stub_card(CardStatus.INBOX, moved=2)
    apply_status_transition(card, None)
    assert card.moved_count == 2
    assert card.completed_at is None


def test_same_status_is_a_no_op():
    card = _stub_card(CardStatus.INBOX, moved=2)
    apply_status_transition(card, CardStatus.INBOX)
    assert card.moved_count == 2


def test_status_change_bumps_moved_count():
    card = _stub_card(CardStatus.INBOX, moved=0)
    apply_status_transition(card, CardStatus.PLANNED)
    assert card.moved_count == 1


def test_entering_done_stamps_completed_at():
    card = _stub_card(CardStatus.TODAY)
    apply_status_transition(card, CardStatus.DONE)
    assert card.completed_at is not None
    assert isinstance(card.completed_at, datetime)


def test_leaving_done_clears_completed_at():
    card = _stub_card(CardStatus.DONE, completed=datetime(2025, 1, 1))
    apply_status_transition(card, CardStatus.TODAY)
    assert card.completed_at is None


def test_done_to_done_is_a_no_op():
    stamp = datetime(2025, 1, 1)
    card = _stub_card(CardStatus.DONE, moved=5, completed=stamp)
    apply_status_transition(card, CardStatus.DONE)
    assert card.moved_count == 5
    assert card.completed_at == stamp


def test_moved_count_handles_none_initial():
    card = SimpleNamespace(status=CardStatus.INBOX, moved_count=None, completed_at=None)
    apply_status_transition(card, CardStatus.PLANNED)
    assert card.moved_count == 1
