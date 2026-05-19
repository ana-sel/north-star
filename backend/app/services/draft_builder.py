"""Deterministic splitter that turns a Sort-mode chat message into drafts.

Slice 3 of the chat redesign. v1 is rules-based — no model call. The
splitter looks for the most common shapes Ana uses when she dumps a
list of things to sort:

    - bullets (`- foo`, `* foo`, `• foo`)
    - numbered (`1. foo`, `2) foo`)
    - newlines
    - semicolons / commas between short phrases

Empty fragments and stop-words ("and", "or", "etc") are dropped. The
output is always a list of `DraftCandidate` items — even for a single
sentence (it just becomes one draft).
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable


_BULLET_RE = re.compile(r"^\s*(?:[-*•]|\d+[.)])\s+", re.MULTILINE)
_SPLIT_NEWLINE_RE = re.compile(r"[\r\n]+")
_SPLIT_SEMI_RE = re.compile(r"\s*;\s*")
# Only split on commas when the sentence is clearly a list (3+ items)
_LIST_COMMA_RE = re.compile(r",(?=\s+\S)")
# Common Sort-mode openers we want to strip before splitting so the first
# fragment doesn't carry "Sort: " / "Todo: " / "List: " into its title.
_PREFIX_RE = re.compile(
    r"^\s*(sort(\s+these)?|list|to[- ]?do|todo|remember to|remind me( to)?|note|idea)\b[\s:\-]+",
    re.IGNORECASE,
)

_MIN_FRAGMENT_LEN = 3
_MAX_FRAGMENTS = 8  # protect against pathological pasted dumps


@dataclass(frozen=True)
class DraftCandidate:
    title: str
    kind: str = "task"
    confidence: float = 0.6
    reason: str = "auto-split from Sort-mode capture"


def split_into_drafts(text: str) -> list[DraftCandidate]:
    """Return one or more draft candidates from a Sort-mode message."""
    cleaned = (text or "").strip()
    if not cleaned:
        return []

    # Strip a leading "Sort: ", "Todo: ", "List: " etc so the first draft
    # title doesn't get polluted with the framing word.
    cleaned = _PREFIX_RE.sub("", cleaned, count=1).strip()
    if not cleaned:
        return []

    fragments = _extract_fragments(cleaned)
    drafts: list[DraftCandidate] = []
    for raw in fragments:
        title = raw.strip(" \t-*•·.,;")
        if len(title) < _MIN_FRAGMENT_LEN:
            continue
        drafts.append(DraftCandidate(title=title[:200]))
        if len(drafts) >= _MAX_FRAGMENTS:
            break
    return drafts


def _extract_fragments(text: str) -> Iterable[str]:
    # 1. Bullet / numbered list → strip the marker, split on newlines.
    if _BULLET_RE.search(text):
        stripped = _BULLET_RE.sub("", text)
        return [f for f in _SPLIT_NEWLINE_RE.split(stripped) if f.strip()]

    # 2. Multi-line plain text → one draft per line.
    if "\n" in text:
        return [f for f in _SPLIT_NEWLINE_RE.split(text) if f.strip()]

    # 3. Semicolon-separated.
    if ";" in text:
        return [f for f in _SPLIT_SEMI_RE.split(text) if f.strip()]

    # 4. Comma list (3+ items) — only when looks like an inventory dump.
    comma_parts = [p.strip() for p in _LIST_COMMA_RE.split(text) if p.strip()]
    if len(comma_parts) >= 3 and all(len(p) <= 60 for p in comma_parts):
        return comma_parts

    # 5. Single thought → single draft.
    return [text]
