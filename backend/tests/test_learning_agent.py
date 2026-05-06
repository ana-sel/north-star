"""Tests for Learning Agent pure helpers.

No DB, no Ollama.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace

from app.api.agents import (
    _build_learning_stats,
    _is_learning_card,
    _learning_fallback_summary,
    _parse_learning,
)
from app.enums import CardStatus, CardType, LifeArea


def _stub_card(**kwargs):
    base = dict(
        id=uuid.uuid4(),
        status=CardStatus.INBOX.value,
        completed_at=None,
        created_at=datetime.now(timezone.utc),
        moved_count=0,
        title="t",
        life_area=None,
        type=CardType.THOUGHT.value,
    )
    base.update(kwargs)
    return SimpleNamespace(**base)


def _stub_habit(**kwargs):
    base = dict(id=uuid.uuid4(), title="Generic", active=True)
    base.update(kwargs)
    return SimpleNamespace(**base)


def _stub_log(habit_id, log_date):
    return SimpleNamespace(habit_id=habit_id, log_date=log_date)


def test_is_learning_card_by_life_area():
    c = _stub_card(life_area=LifeArea.WORK_SKILLS.value)
    assert _is_learning_card(c) is True


def test_is_learning_card_by_type():
    c = _stub_card(type=CardType.RESEARCH.value)
    assert _is_learning_card(c) is True


def test_not_learning_card():
    c = _stub_card(life_area=LifeArea.FAMILY.value, type=CardType.TASK.value)
    assert _is_learning_card(c) is False


def test_build_learning_stats_counts():
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=14)
    cards = [
        # learning card, completed in window
        _stub_card(
            life_area=LifeArea.WORK_SKILLS.value,
            status=CardStatus.DONE.value,
            created_at=now - timedelta(days=5),
            completed_at=now - timedelta(days=1),
        ),
        # learning card, in progress
        _stub_card(
            type=CardType.RESEARCH.value,
            status=CardStatus.IN_PROGRESS_MY_SIDE.value,
            created_at=now - timedelta(days=3),
        ),
        # non-learning card
        _stub_card(
            life_area=LifeArea.FAMILY.value,
            status=CardStatus.DONE.value,
            created_at=now - timedelta(days=2),
            completed_at=now - timedelta(days=1),
        ),
    ]
    h1 = _stub_habit(title="Study CS50")
    h2 = _stub_habit(title="Morning walk")  # not learning
    today = date.today()
    logs = [
        _stub_log(h1.id, today),
        _stub_log(h1.id, today - timedelta(days=1)),
        _stub_log(h2.id, today),  # non-learning habit
    ]
    stats = _build_learning_stats(cards, [h1, h2], logs, since, 14)
    assert stats.learning_cards_total == 2  # the 2 learning cards
    assert stats.learning_cards_completed == 1
    assert stats.learning_cards_in_progress == 1
    assert stats.learning_habits_active == 1  # "Study CS50"
    assert stats.learning_habit_logged_days == 2  # two distinct days


def test_learning_habit_keyword_matching():
    """Various learning-related keywords should match."""
    keywords = ["Learn Python", "Study for exam", "Read book", "Practice piano", "CS course"]
    for kw in keywords:
        h = _stub_habit(title=kw)
        stats = _build_learning_stats([], [h], [], datetime.now(timezone.utc), 7)
        assert stats.learning_habits_active == 1, f"'{kw}' should match"


def test_parse_learning_valid():
    text = (
        '{"summary": "Good learning week.", '
        '"patterns": ["consistent study time"], '
        '"suggestions": ["try spaced repetition"]}'
    )
    out = _parse_learning(text)
    assert out is not None
    assert out["summary"] == "Good learning week."
    assert len(out["patterns"]) == 1
    assert len(out["suggestions"]) == 1


def test_parse_learning_garbage_returns_none():
    assert _parse_learning("no json") is None


def test_fallback_summary_no_activity():
    stub = SimpleNamespace(
        window_days=14,
        learning_cards_total=0,
        learning_cards_completed=0,
        learning_cards_in_progress=0,
        learning_habits_active=0,
        learning_habit_logged_days=0,
    )
    s = _learning_fallback_summary(stub)
    assert "No learning activity" in s
