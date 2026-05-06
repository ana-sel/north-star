"""Tests for Review Agent pure helpers (parser + stats builder).

No DB, no Ollama.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.api.agents import (
    _build_review_stats,
    _fallback_summary,
    _parse_review,
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


def test_build_stats_counts_completed_and_created_in_window():
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=1)
    cards = [
        _stub_card(
            status=CardStatus.DONE.value,
            completed_at=now - timedelta(hours=2),
            created_at=now - timedelta(hours=3),
        ),
        _stub_card(
            status=CardStatus.DONE.value,
            completed_at=now - timedelta(days=5),  # outside window
            created_at=now - timedelta(days=5),
        ),
        _stub_card(
            status=CardStatus.INBOX.value,
            created_at=now - timedelta(hours=1),
        ),
    ]
    stats = _build_review_stats(cards, since)
    assert stats.completed == 1
    assert stats.created == 2  # the in-window done + inbox
    assert stats.by_status[CardStatus.DONE.value] == 2
    assert stats.by_status[CardStatus.INBOX.value] == 1


def test_build_stats_counts_in_progress_bucket():
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=1)
    cards = [
        _stub_card(status=CardStatus.IN_PROGRESS_MY_SIDE.value),
        _stub_card(status=CardStatus.TODAY.value),
        _stub_card(status=CardStatus.REVIEW.value),
        _stub_card(status=CardStatus.INBOX.value),
    ]
    stats = _build_review_stats(cards, since)
    assert stats.in_progress == 3


def test_build_stats_sums_moved_count():
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=1)
    cards = [_stub_card(moved_count=2), _stub_card(moved_count=5)]
    stats = _build_review_stats(cards, since)
    assert stats.moved == 7


def test_parse_valid_review_json():
    text = (
        '{"summary": "Productive day.", '
        '"wins": ["Shipped feature"], '
        '"patterns": ["lots of context-switching"], '
        '"suggestions": ["Block 90 mins focus"]}'
    )
    out = _parse_review(text)
    assert out is not None
    assert out["summary"] == "Productive day."
    assert out["wins"] == ["Shipped feature"]
    assert out["patterns"] == ["lots of context-switching"]
    assert out["suggestions"] == ["Block 90 mins focus"]


def test_parse_truncates_long_strings():
    long = "x" * 500
    text = (
        '{"summary": "' + long + '", '
        '"wins": ["' + long + '"], '
        '"patterns": [], "suggestions": []}'
    )
    out = _parse_review(text)
    assert out is not None
    assert len(out["summary"]) == 240
    assert len(out["wins"][0]) == 120


def test_parse_caps_list_items():
    items = ",".join(f'"w{i}"' for i in range(20))
    text = (
        '{"summary": "ok", '
        f'"wins": [{items}], "patterns": [], "suggestions": []}}'
    )
    out = _parse_review(text)
    assert out is not None
    assert len(out["wins"]) == 6


def test_parse_returns_none_on_garbage():
    assert _parse_review("nope") is None
    assert _parse_review('{"wins": []}') is None  # missing summary
    assert _parse_review('{"summary": ""}') is None
    assert _parse_review('"a string"') is None


def test_parse_skips_non_string_list_items():
    text = (
        '{"summary": "ok", '
        '"wins": [123, "real", null, {"x":1}], '
        '"patterns": [], "suggestions": []}'
    )
    out = _parse_review(text)
    assert out is not None
    assert out["wins"] == ["real"]


def test_fallback_summary_includes_counts():
    from app.api.agents import ReviewStats

    stats = ReviewStats(
        completed=2, created=4, in_progress=1, moved=3, by_status={}
    )
    s = _fallback_summary(stats, 7)
    assert "7 day" in s
    assert "2 completed" in s
    assert "4 created" in s
