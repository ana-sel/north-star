"""Tests for Goal Architect Agent JSON parser.

Pure helper — no DB, no Ollama. Mirrors test_focus / test_capture style.
"""
from __future__ import annotations

from app.api.agents import _ARCHITECT_PICK_MAX, _parse_architect_suggestions
from app.enums import CardLevel


def test_parse_valid_json_returns_suggestions():
    text = (
        '{"children": ['
        '{"title": "Set up backend", "description": "FastAPI + Postgres"},'
        '{"title": "Build mobile shell", "description": null}'
        "]}"
    )
    out = _parse_architect_suggestions(text, CardLevel.PROJECT)
    assert [s.title for s in out] == ["Set up backend", "Build mobile shell"]
    assert out[0].description == "FastAPI + Postgres"
    assert out[1].description is None
    assert all(s.level == CardLevel.PROJECT for s in out)


def test_parse_tolerates_prose_around_json():
    text = "Sure! Here you go:\n{\"children\": [{\"title\": \"A\"}]}\nlet me know."
    out = _parse_architect_suggestions(text, CardLevel.MILESTONE)
    assert [s.title for s in out] == ["A"]


def test_parse_dedupes_titles_case_insensitive():
    text = '{"children": [{"title": "Read book"},{"title": "READ BOOK"},{"title": "Walk"}]}'
    out = _parse_architect_suggestions(text, CardLevel.TASK)
    assert [s.title for s in out] == ["Read book", "Walk"]


def test_parse_caps_at_pick_max():
    children = ",".join(f'{{"title": "T{i}"}}' for i in range(1, 20))
    text = f'{{"children": [{children}]}}'
    out = _parse_architect_suggestions(text, CardLevel.GOAL)
    assert len(out) == _ARCHITECT_PICK_MAX


def test_parse_skips_invalid_entries():
    text = (
        '{"children": ['
        '"just a string",'
        '{"title": ""},'
        '{"description": "no title"},'
        '{"title": "Valid"}'
        "]}"
    )
    out = _parse_architect_suggestions(text, CardLevel.GOAL)
    assert [s.title for s in out] == ["Valid"]


def test_parse_returns_empty_on_garbage():
    assert _parse_architect_suggestions("nope", CardLevel.GOAL) == []
    assert _parse_architect_suggestions('{"other": []}', CardLevel.GOAL) == []
    assert _parse_architect_suggestions('{"children": "string"}', CardLevel.GOAL) == []


def test_parse_truncates_long_titles_and_descriptions():
    long_title = "A" * 200
    long_desc = "B" * 500
    text = (
        '{"children": [{"title": "' + long_title + '", "description": "' + long_desc + '"}]}'
    )
    out = _parse_architect_suggestions(text, CardLevel.PROJECT)
    assert len(out[0].title) == 80
    assert len(out[0].description or "") == 200
