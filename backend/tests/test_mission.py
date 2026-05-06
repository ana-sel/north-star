"""Tests for Mission Agent JSON parser.

Pure helper — no DB, no Ollama.
"""
from __future__ import annotations

from app.api.agents import _MISSION_KEYS, _parse_mission_scores


def test_parse_full_valid_response():
    parts = ",".join(
        f'"{k}": {{"score": {i}, "note": "n{i}"}}'
        for i, k in enumerate(_MISSION_KEYS)
    )
    text = "{" + parts + "}"
    out = _parse_mission_scores(text)
    assert set(out.keys()) == set(_MISSION_KEYS)
    assert out[_MISSION_KEYS[0]].score == 0
    assert out[_MISSION_KEYS[0]].note == "n0"
    assert out[_MISSION_KEYS[-1]].score == len(_MISSION_KEYS) - 1


def test_parse_clamps_score_range():
    text = (
        '{"happiness": {"score": 99, "note": null},'
        ' "hidden_rules": {"score": -5, "note": null}}'
    )
    out = _parse_mission_scores(text)
    assert out["happiness"].score == 10
    assert out["hidden_rules"].score == 0


def test_parse_skips_missing_or_invalid_filters():
    text = (
        '{"happiness": {"score": "bad"},'
        ' "freedom": {"note": "no score"},'
        ' "meaning": {"score": 7}}'
    )
    out = _parse_mission_scores(text)
    assert list(out.keys()) == ["meaning"]
    assert out["meaning"].score == 7


def test_parse_truncates_long_note():
    long = "x" * 200
    text = '{"clarity": {"score": 5, "note": "' + long + '"}}'
    out = _parse_mission_scores(text)
    assert len(out["clarity"].note or "") == 80


def test_parse_tolerates_surrounding_prose():
    text = (
        "Here are the scores:\n"
        '{"happiness": {"score": 8, "note": "good"}}'
        "\nThanks!"
    )
    out = _parse_mission_scores(text)
    assert out["happiness"].score == 8


def test_parse_returns_empty_on_garbage():
    assert _parse_mission_scores("nope") == {}
    assert _parse_mission_scores('{"other": 1}') == {}
    assert _parse_mission_scores('"just a string"') == {}


def test_parse_handles_null_note():
    text = '{"meaning": {"score": 6, "note": null}}'
    out = _parse_mission_scores(text)
    assert out["meaning"].score == 6
    assert out["meaning"].note is None
