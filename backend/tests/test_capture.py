"""Tests for the Capture Agent parser.

We don't exercise the full gateway+Ollama path here — that would need a
running model and a DB. Instead we hit the pure helpers in
`app.api.agents` directly.
"""
from __future__ import annotations

from app.api.agents import _fallback_draft, _parse_draft
from app.enums import CardType, LifeArea


def test_parse_valid_json_object():
    text = '{"title": "Buy milk", "description": null, "type": "task", "life_area": "home_property"}'
    draft = _parse_draft(text, fallback_text="raw")
    assert draft.title == "Buy milk"
    assert draft.description is None
    assert draft.type == CardType.TASK
    assert draft.life_area == LifeArea.HOME_PROPERTY


def test_parse_extracts_json_from_surrounding_prose():
    text = (
        "Sure, here is the JSON:\n"
        '{"title": "Read a book", "type": "thought"}\n'
        "Hope this helps."
    )
    draft = _parse_draft(text, fallback_text="raw")
    assert draft.title == "Read a book"
    assert draft.type == CardType.THOUGHT


def test_parse_unknown_type_falls_back_to_thought():
    text = '{"title": "Hello", "type": "definitely-not-a-type"}'
    draft = _parse_draft(text, fallback_text="raw")
    assert draft.type == CardType.THOUGHT


def test_parse_unknown_life_area_becomes_none():
    text = '{"title": "Hello", "type": "task", "life_area": "nope"}'
    draft = _parse_draft(text, fallback_text="raw")
    assert draft.life_area is None


def test_parse_invalid_json_uses_fallback():
    draft = _parse_draft("absolutely not json", fallback_text="raw thought here")
    assert draft.title == "raw thought here"
    assert draft.type == CardType.THOUGHT


def test_parse_truncates_long_titles():
    long_title = "x" * 500
    text = '{"title": "' + long_title + '", "type": "task"}'
    draft = _parse_draft(text, fallback_text="raw")
    assert len(draft.title) == 100


def test_fallback_uses_first_line():
    draft = _fallback_draft("first line\nsecond line\nthird")
    assert draft.title == "first line"
    assert draft.type == CardType.THOUGHT


def test_fallback_handles_empty_text():
    draft = _fallback_draft("   \n  ")
    assert draft.title == "(untitled)"
