"""Unit tests for the Phase 3 hybrid redactor.

Run with:  pytest backend/tests
"""
from __future__ import annotations

import asyncio

from app.gateway.redactor import (
    HybridRedactor,
    OllamaSemanticRedactor,
    RegexRedactor,
    VocabularyRedactor,
)


def test_regex_redacts_email_and_phone():
    r = RegexRedactor()
    text = "Email me at jane.doe@example.com or call +44 7700 900123."
    out = r.redact(text)
    assert "jane.doe@example.com" not in out.redacted_text
    assert "+44" not in out.redacted_text
    cats = {cat for _, _, cat in out.placeholders}
    assert "EMAIL" in cats
    assert "PHONE" in cats


def test_regex_redacts_money():
    r = RegexRedactor()
    text = "I have £18,808 saved and spent $1,200.50 last month."
    out = r.redact(text)
    assert "18,808" not in out.redacted_text
    assert "1,200.50" not in out.redacted_text
    cats = [cat for _, _, cat in out.placeholders]
    assert cats.count("MONEY_AMOUNT") == 2


def test_regex_repeated_value_reuses_placeholder():
    r = RegexRedactor()
    text = "Send to a@b.com and CC a@b.com please."
    out = r.redact(text)
    # Same email should map to the same placeholder, recorded once.
    placeholders_for_email = [
        (ph, orig)
        for ph, orig, cat in out.placeholders
        if cat == "EMAIL"
    ]
    assert len(placeholders_for_email) == 1
    assert out.redacted_text.count(placeholders_for_email[0][0]) == 2


def test_vocabulary_redacts_default_phrases():
    v = VocabularyRedactor()
    text = "I should call my mother about my salary."
    out = v.redact(text)
    assert "my mother" not in out.redacted_text.lower()
    assert "my salary" not in out.redacted_text.lower()
    cats = {cat for _, _, cat in out.placeholders}
    assert "FAMILY_MEMBER" in cats
    assert "INCOME" in cats


def test_vocabulary_longest_phrase_wins():
    v = VocabularyRedactor()
    text = "Update my home address tomorrow."
    out = v.redact(text)
    # The longer phrase "my home address" should be redacted as a whole.
    assert "my home address" not in out.redacted_text.lower()


def test_hybrid_pipeline_runs_all_passes():
    semantic = OllamaSemanticRedactor(enabled=False)  # offline-safe
    h = HybridRedactor(
        regex=RegexRedactor(),
        vocabulary=VocabularyRedactor(),
        semantic=semantic,
    )
    text = "Email a@b.com about my mother — she owes £500."
    out = asyncio.run(h.redact(text))
    assert "a@b.com" not in out.redacted_text
    assert "my mother" not in out.redacted_text.lower()
    assert "500" not in out.redacted_text
    # Audit map must be category-only (no originals).
    audit = out.map_for_audit
    assert all(isinstance(v, str) for v in audit.values())
    assert "a@b.com" not in audit.values()


def test_audit_map_has_no_originals():
    r = RegexRedactor()
    out = r.redact("Reach me at secret@hidden.com")
    audit = out.map_for_audit
    # Categories only — never the raw email.
    assert "secret@hidden.com" not in audit.values()
    assert all(v == "EMAIL" for v in audit.values())
