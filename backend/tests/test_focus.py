"""Tests for Focus Agent JSON parser + heuristic fallback.

Like test_capture, we exercise the pure helpers — no DB, no Ollama.
"""
from __future__ import annotations

import uuid
from types import SimpleNamespace

from app.api.agents import _fallback_picks, _parse_focus_picks
from app.enums import EnergyLevel


def _stub_card(title: str, energy: EnergyLevel = EnergyLevel.MEDIUM):
    return SimpleNamespace(
        id=uuid.uuid4(),
        title=title,
        energy_required=energy,
    )


def test_parse_valid_json_returns_picks_in_order():
    by_idx = {1: _stub_card("A"), 2: _stub_card("B"), 3: _stub_card("C")}
    text = '{"picks": [{"id": 2, "reason": "fits energy"}, {"id": 1}]}'
    picks = _parse_focus_picks(text, by_idx)
    assert [p.title for p in picks] == ["B", "A"]
    assert picks[0].reason == "fits energy"
    assert picks[1].reason is None


def test_parse_caps_at_max_three():
    by_idx = {i: _stub_card(f"T{i}") for i in range(1, 6)}
    text = '{"picks": [{"id":1},{"id":2},{"id":3},{"id":4},{"id":5}]}'
    picks = _parse_focus_picks(text, by_idx)
    assert len(picks) == 3


def test_parse_skips_unknown_ids():
    by_idx = {1: _stub_card("A")}
    text = '{"picks": [{"id": 99}, {"id": 1}]}'
    picks = _parse_focus_picks(text, by_idx)
    assert [p.title for p in picks] == ["A"]


def test_parse_dedupes_repeated_ids():
    by_idx = {1: _stub_card("A"), 2: _stub_card("B")}
    text = '{"picks": [{"id": 1}, {"id": 1}, {"id": 2}]}'
    picks = _parse_focus_picks(text, by_idx)
    assert [p.title for p in picks] == ["A", "B"]


def test_parse_invalid_json_returns_empty():
    by_idx = {1: _stub_card("A")}
    assert _parse_focus_picks("nope", by_idx) == []


def test_parse_extracts_json_from_prose():
    by_idx = {1: _stub_card("A")}
    text = 'Sure! {"picks":[{"id":1,"reason":"good"}]} done.'
    picks = _parse_focus_picks(text, by_idx)
    assert len(picks) == 1
    assert picks[0].reason == "good"


def test_parse_truncates_long_reasons():
    by_idx = {1: _stub_card("A")}
    long_reason = "x" * 500
    text = '{"picks":[{"id":1,"reason":"' + long_reason + '"}]}'
    picks = _parse_focus_picks(text, by_idx)
    assert picks[0].reason is not None
    assert len(picks[0].reason) == 120


def test_fallback_prefers_matching_energy():
    cards = [
        _stub_card("low1", EnergyLevel.LOW),
        _stub_card("high1", EnergyLevel.HIGH),
        _stub_card("low2", EnergyLevel.LOW),
        _stub_card("med1", EnergyLevel.MEDIUM),
    ]
    picks = _fallback_picks(cards, EnergyLevel.LOW)
    assert [p.title for p in picks[:2]] == ["low1", "low2"]


def test_fallback_caps_at_three():
    cards = [_stub_card(f"c{i}", EnergyLevel.MEDIUM) for i in range(10)]
    picks = _fallback_picks(cards, EnergyLevel.MEDIUM)
    assert len(picks) == 3


def test_fallback_with_empty_candidates():
    assert _fallback_picks([], EnergyLevel.HIGH) == []
