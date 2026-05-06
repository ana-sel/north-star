"""Tests for Healing Agent pure helpers.

No DB, no Ollama.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace

from app.api.agents import (
    _build_healing_stats,
    _is_healing_card,
    _healing_fallback_summary,
    _parse_healing,
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


def _stub_health(**kwargs):
    base = dict(
        log_date=date.today(),
        mood=None,
        energy=None,
    )
    base.update(kwargs)
    return SimpleNamespace(**base)


def _stub_habit(**kwargs):
    base = dict(id=uuid.uuid4(), title="Generic", active=True)
    base.update(kwargs)
    return SimpleNamespace(**base)


def _stub_log(habit_id, log_date):
    return SimpleNamespace(habit_id=habit_id, log_date=log_date)


def test_is_healing_card_by_life_area():
    c = _stub_card(life_area=LifeArea.MIND_HEALING.value)
    assert _is_healing_card(c) is True


def test_is_healing_card_by_type():
    c = _stub_card(type=CardType.DIARY.value)
    assert _is_healing_card(c) is True


def test_not_healing_card():
    c = _stub_card(life_area=LifeArea.MONEY_FREEDOM.value, type=CardType.TASK.value)
    assert _is_healing_card(c) is False


def test_build_healing_stats():
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=14)
    cards = [
        _stub_card(
            life_area=LifeArea.MIND_HEALING.value,
            created_at=now - timedelta(days=3),
        ),
        _stub_card(
            type=CardType.DIARY.value,
            created_at=now - timedelta(days=1),
        ),
        _stub_card(type=CardType.TASK.value),
    ]
    health = [
        _stub_health(mood=7, energy=6),
        _stub_health(mood=5, energy=4),
    ]
    h1 = _stub_habit(title="Morning meditation")
    h2 = _stub_habit(title="Run 5k")  # not healing
    today = date.today()
    logs = [
        _stub_log(h1.id, today),
        _stub_log(h1.id, today - timedelta(days=1)),
        _stub_log(h2.id, today),
    ]
    stats = _build_healing_stats(cards, health, [h1, h2], logs, since, 14)
    assert stats.healing_cards_total == 2
    assert stats.healing_cards_created == 2
    assert stats.diary_entries_in_window == 1
    assert stats.avg_mood == 6.0
    assert stats.avg_energy == 5.0
    assert stats.healing_habits_active == 1
    assert stats.healing_habit_logged_days == 2


def test_healing_habit_keywords():
    for kw in ["Meditate", "Breath work", "Therapy session", "Yoga morning", "Journaling"]:
        h = _stub_habit(title=kw)
        stats = _build_healing_stats([], [], [h], [], datetime.now(timezone.utc), 7)
        assert stats.healing_habits_active == 1, f"'{kw}' should match"


def test_parse_healing_valid():
    text = (
        '{"summary": "Gentle week.", '
        '"patterns": ["consistent journaling"], '
        '"suggestions": ["keep going"]}'
    )
    out = _parse_healing(text)
    assert out is not None
    assert out["summary"] == "Gentle week."


def test_parse_healing_garbage():
    assert _parse_healing("no json") is None


def test_fallback_no_activity():
    stub = SimpleNamespace(
        window_days=14,
        healing_cards_total=0,
        healing_cards_created=0,
        diary_entries_in_window=0,
        avg_mood=None,
        avg_energy=None,
        healing_habits_active=0,
        healing_habit_logged_days=0,
    )
    s = _healing_fallback_summary(stub)
    assert "No healing activity" in s
