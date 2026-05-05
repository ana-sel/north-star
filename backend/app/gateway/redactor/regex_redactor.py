"""Regex-based PII redactor.

Catches structured patterns that are statistically reliable: emails,
phone numbers, URLs, IBANs, payment card numbers, currency amounts.

Each pattern emits a counter-suffixed placeholder, e.g. `[EMAIL_1]`,
`[PHONE_2]`, so the same original maps to the same placeholder within
one redaction pass — useful for keeping AI output readable.
"""
from __future__ import annotations

import re
from collections import defaultdict

from app.gateway.redactor.types import RedactionResult


# Pattern → category.  Order matters: more specific first.
_PATTERNS: list[tuple[str, re.Pattern]] = [
    # Email — common-case RFC-ish.
    ("EMAIL", re.compile(r"\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b")),
    # IBAN — 15–34 alphanum, country prefix.
    ("IBAN", re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b")),
    # Payment card — 13–19 digits with optional spaces/dashes.
    (
        "CARD_NUMBER",
        re.compile(r"\b(?:\d[ \-]?){12,18}\d\b"),
    ),
    # International phone numbers.
    (
        "PHONE",
        re.compile(
            r"(?<!\w)(?:\+?\d{1,3}[ \-]?)?(?:\(?\d{2,4}\)?[ \-]?)?"
            r"\d{3}[ \-]?\d{3,4}(?!\w)"
        ),
    ),
    # URLs (http / https / www).
    (
        "URL",
        re.compile(r"\bhttps?://\S+|\bwww\.[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\S*"),
    ),
    # Money amounts: £18,808 / $1,200.50 / 18 808 € / 1.234,56 EUR
    (
        "MONEY_AMOUNT",
        re.compile(
            r"(?:[£$€¥]\s?\d[\d\s.,]*\d|"
            r"\d[\d\s.,]*\d\s?(?:GBP|USD|EUR|JPY|PLN|CHF|SEK))"
        ),
    ),
]


class RegexRedactor:
    name = "regex"

    def __init__(self) -> None:
        self._patterns = _PATTERNS

    def redact(self, text: str) -> RedactionResult:
        placeholders: list[tuple[str, str, str]] = []
        # category → original → placeholder, so the same original within
        # one pass reuses its placeholder.
        seen: dict[str, dict[str, str]] = defaultdict(dict)
        counter: dict[str, int] = defaultdict(int)

        out = text
        for category, pattern in self._patterns:

            def _sub(match: re.Match) -> str:
                original = match.group(0)
                if original in seen[category]:
                    return seen[category][original]
                counter[category] += 1
                placeholder = f"[{category}_{counter[category]}]"
                seen[category][original] = placeholder
                placeholders.append((placeholder, original, category))
                return placeholder

            out = pattern.sub(_sub, out)

        return RedactionResult(redacted_text=out, placeholders=placeholders)
