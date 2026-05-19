"""Triage classifier — Chat redesign slice 2.

Reads a free-text chat message and returns one of six interpretation
*kinds* the conversation should be treated as. v1 is fully deterministic
(keyword + structural rules) so it always runs offline and is cheap
enough to call on every send. A future v2 can swap the implementation
for a local LLM behind the same `classify()` signature.

Kinds (per `docs/plans/chat-redesign.md` Slice 2):

  talk      — open conversation, questions, vague exploration. Default.
  sort      — short note that wants to become an item ("remind me", "idea:")
  diary     — emotional reflection, journal-style first person
  decision  — high-stakes choice (money / property / health / legal / life)
  log       — quick factual record ("ate eggs", "spent 5 on coffee", "slept 6h")
  review    — retrospective ("looking back", "this week", "what worked")

The contract is intentionally narrow: input is the raw text; output is
`TriageResult(kind, confidence, reason)`. `confidence` is 0.0–1.0 and
reflects how cleanly the rules fired — UI uses it to decide how loud the
interpretation chip should be.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

TriageKind = Literal["talk", "sort", "diary", "decision", "log", "review"]


@dataclass(frozen=True)
class TriageResult:
    kind: TriageKind
    confidence: float
    reason: str


# Ordered, case-insensitive keyword sets. First strong match wins.
# Keep these tight: false positives are worse than falling back to talk.

_DECISION_PATTERNS = [
    r"\bshould i\b",
    r"\bdo i\b.*\b(buy|sell|quit|leave|move|sign|invest)\b",
    r"\b(buy(ing)?|sell(ing)?|invest(ing)? in|mov(e|ing) (to|out)|quit(ting)?|resign(ing)?|sign(ing)? (the|a) lease|mortgage)\b",
    r"\b(decision|decide|deciding)\b",
    r"\b(pros and cons|trade-?offs?)\b",
]

_LOG_PATTERNS = [
    r"^\s*[/]",                                # slash command
    r"\b(spent|paid|cost)\b\s*[€$£]?\s*\d",    # spent 5, paid €12
    r"\bate\b",
    r"\bdrank\b",
    r"\bslept\b\s*\d",                          # slept 6h
    r"\b\d+\s*(h|hr|hrs|hour|hours|min|mins|minutes|kcal|km|kg|reps)\b",
]

_DIARY_PATTERNS = [
    r"\bi (feel|felt|am feeling|was feeling)\b",
    r"\b(today|tonight|this morning|this evening) (was|felt|i)\b",
    r"\bheavy\b|\bnumb\b|\boverwhelm(ed|ing)?\b|\bgrief\b|\blonely\b|\bsad\b|\bashamed\b",
    r"\bi('m| am) (tired|exhausted|drained|burnt out)\b",
]

_REVIEW_PATTERNS = [
    r"\b(looking back|in hindsight|reflect(ing)? on|this (week|month|quarter))\b",
    r"\b(what (worked|didn'?t work)|lessons? learned)\b",
    r"\b(retro|review|recap)\b",
]

_SORT_PATTERNS = [
    r"^\s*(remind me|remember to)\b",
    r"^\s*(idea|note)[:\-]",
]

# Explicit "this is a list to sort" openers / structural signals.
# These outrank decision/log/etc so a message like "Sort: buy milk;
# pay rent" doesn't get hijacked by the `buy` decision keyword.
_EXPLICIT_SORT_PATTERNS = [
    r"^\s*sort\b[\s:\-]",          # "sort these:", "sort: …"
    r"^\s*list[:\-]",               # "list: foo, bar"
    r"^\s*to[- ]?do[:\-]",          # "todo:", "to-do: ", "to do:"
    r"^\s*[-*]\s+\S",                # markdown bullet list
    r"^\s*\d+[.)]\s+\S",             # numbered list
]


def _matches(text: str, patterns: list[str]) -> str | None:
    for pat in patterns:
        if re.search(pat, text, re.IGNORECASE):
            return pat
    return None


def classify(text: str) -> TriageResult:
    """Classify a chat message into one of six interpretation kinds.

    Deterministic. No I/O. Safe to call on every send.
    """
    stripped = (text or "").strip()
    if not stripped:
        return TriageResult(kind="talk", confidence=0.0, reason="empty message")

    # Strong signals first. Explicit sort openers ("Sort:", bullet/numbered
    # lists) win over keyword-based decision/log so we don't misread
    # "Sort: buy milk; pay rent" as a decision because of the word `buy`.
    if pat := _matches(stripped, _EXPLICIT_SORT_PATTERNS):
        return TriageResult(kind="sort", confidence=0.9, reason=f"matched: {pat}")
    if pat := _matches(stripped, _DECISION_PATTERNS):
        return TriageResult(kind="decision", confidence=0.85, reason=f"matched: {pat}")
    if pat := _matches(stripped, _LOG_PATTERNS):
        return TriageResult(kind="log", confidence=0.85, reason=f"matched: {pat}")
    if pat := _matches(stripped, _REVIEW_PATTERNS):
        return TriageResult(kind="review", confidence=0.8, reason=f"matched: {pat}")
    if pat := _matches(stripped, _SORT_PATTERNS):
        return TriageResult(kind="sort", confidence=0.75, reason=f"matched: {pat}")
    # Structural: a message with 2+ semicolons reads as a sort list.
    if stripped.count(";") >= 2:
        return TriageResult(
            kind="sort",
            confidence=0.6,
            reason="semicolon-separated list",
        )
    if pat := _matches(stripped, _DIARY_PATTERNS):
        return TriageResult(kind="diary", confidence=0.7, reason=f"matched: {pat}")

    # Structural fallback: a long reflective paragraph also reads as diary.
    if len(stripped) >= 200 and stripped.count(".") >= 2:
        return TriageResult(
            kind="diary",
            confidence=0.5,
            reason="long reflective paragraph",
        )

    return TriageResult(kind="talk", confidence=0.4, reason="no rule matched")
