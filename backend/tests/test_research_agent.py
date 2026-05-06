"""Tests for Research Agent pure helpers.

No DB, no Ollama.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.api.agents import (
    _build_research_stats,
    _parse_research,
    _research_fallback_summary,
)
from app.enums import CardStatus, CardType


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


def test_counts_research_cards_only():
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=14)
    cards = [
        _stub_card(
            type=CardType.RESEARCH.value,
            status=CardStatus.DONE.value,
            created_at=now - timedelta(days=3),
            completed_at=now - timedelta(days=1),
        ),
        _stub_card(
            type=CardType.RESEARCH.value,
            status=CardStatus.IN_PROGRESS_MY_SIDE.value,
            created_at=now - timedelta(days=5),
        ),
        _stub_card(type=CardType.TASK.value),  # not research
    ]
    stats = _build_research_stats(cards, since, 14)
    assert stats.research_cards_total == 2
    assert stats.research_cards_completed == 1
    assert stats.research_cards_in_progress == 1
    assert stats.research_cards_created == 2


def test_old_cards_outside_window():
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=7)
    cards = [
        _stub_card(
            type=CardType.RESEARCH.value,
            created_at=now - timedelta(days=30),
            completed_at=now - timedelta(days=20),
        ),
    ]
    stats = _build_research_stats(cards, since, 7)
    assert stats.research_cards_total == 1  # total always counts
    assert stats.research_cards_created == 0
    assert stats.research_cards_completed == 0


def test_parse_research_valid():
    text = (
        '{"summary": "Active research.", '
        '"patterns": ["deep dives on weekends"], '
        '"suggestions": ["try literature reviews"]}'
    )
    out = _parse_research(text)
    assert out is not None
    assert out["summary"] == "Active research."


def test_parse_research_garbage():
    assert _parse_research("nothing") is None


def test_fallback_no_cards():
    stub = SimpleNamespace(
        window_days=30,
        research_cards_total=0,
        research_cards_created=0,
        research_cards_completed=0,
        research_cards_in_progress=0,
    )
    s = _research_fallback_summary(stub)
    assert "No research cards" in s
