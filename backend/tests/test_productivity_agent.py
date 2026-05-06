"""Tests for Productivity Agent pure helpers.

No DB, no Ollama.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace

from app.api.agents import (
    _build_productivity_stats,
    _parse_productivity,
    _productivity_fallback_summary,
)
from app.enums import CardStatus


def _stub_card(**kwargs):
    base = dict(
        id=uuid.uuid4(),
        status=CardStatus.INBOX.value,
        completed_at=None,
        created_at=datetime.now(timezone.utc),
        moved_count=0,
        title="t",
    )
    base.update(kwargs)
    return SimpleNamespace(**base)


def _stub_habit(**kwargs):
    base = dict(
        id=uuid.uuid4(),
        title="Drink water",
        active=True,
    )
    base.update(kwargs)
    return SimpleNamespace(**base)


def _stub_log(habit_id, log_date):
    return SimpleNamespace(habit_id=habit_id, log_date=log_date)


def test_completion_rate_and_avg_dtc():
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=14)
    cards = [
        _stub_card(
            status=CardStatus.DONE.value,
            created_at=now - timedelta(days=3),
            completed_at=now - timedelta(days=1),  # 2 days
        ),
        _stub_card(
            status=CardStatus.DONE.value,
            created_at=now - timedelta(days=8),
            completed_at=now - timedelta(days=4),  # 4 days
        ),
        # Created in window, not completed:
        _stub_card(
            status=CardStatus.INBOX.value,
            created_at=now - timedelta(days=2),
        ),
        _stub_card(
            status=CardStatus.INBOX.value,
            created_at=now - timedelta(days=2),
        ),
        # In progress (counts toward in_progress, not created window):
        _stub_card(
            status=CardStatus.IN_PROGRESS_MY_SIDE.value,
            created_at=now - timedelta(days=30),
        ),
    ]
    stats = _build_productivity_stats(cards, [], [], since, 14)
    assert stats.cards_created == 4  # 2 done + 2 inbox, all in window
    assert stats.cards_completed == 2
    assert stats.cards_in_progress == 1
    # 2/4 = 0.5
    assert stats.completion_rate == 0.5
    # avg of 2 and 4 days
    assert stats.avg_days_to_complete == 3.0


def test_completed_outside_window_excluded():
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=7)
    cards = [
        _stub_card(
            status=CardStatus.DONE.value,
            created_at=now - timedelta(days=30),
            completed_at=now - timedelta(days=20),  # outside window
        ),
    ]
    stats = _build_productivity_stats(cards, [], [], since, 7)
    assert stats.cards_completed == 0
    assert stats.cards_created == 0
    assert stats.avg_days_to_complete is None
    assert stats.completion_rate == 0.0


def test_habit_progress_counts_distinct_days():
    h1 = _stub_habit(title="Water")
    h2 = _stub_habit(title="Walk", active=False)  # inactive -> excluded
    h3 = _stub_habit(title="Read")

    today = date.today()
    logs = [
        _stub_log(h1.id, today),
        _stub_log(h1.id, today),  # duplicate same day
        _stub_log(h1.id, today - timedelta(days=1)),
        _stub_log(h3.id, today),
    ]
    stats = _build_productivity_stats([], [h1, h2, h3], logs, datetime.now(timezone.utc), 14)
    titles = {h.title: h for h in stats.habits}
    assert "Walk" not in titles  # inactive excluded
    assert titles["Water"].logged_days == 2  # distinct days
    assert titles["Water"].target_days == 14
    assert titles["Read"].logged_days == 1


def test_parse_productivity_valid():
    text = (
        '{"summary": "Strong week.", '
        '"patterns": ["mornings are productive"], '
        '"suggestions": ["protect deep work"]}'
    )
    out = _parse_productivity(text)
    assert out is not None
    assert out["summary"] == "Strong week."
    assert out["patterns"] == ["mornings are productive"]
    assert out["suggestions"] == ["protect deep work"]


def test_parse_productivity_garbage_returns_none():
    assert _parse_productivity("no json here") is None
    assert _parse_productivity('{"patterns": []}') is None  # missing summary


def test_fallback_summary_mentions_window():
    stub = SimpleNamespace(
        window_days=21,
        cards_completed=3,
        cards_created=5,
        cards_in_progress=2,
    )
    s = _productivity_fallback_summary(stub)
    assert "21" in s
    assert "3" in s
