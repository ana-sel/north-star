"""Vocabulary-based redactor.

Catches user-specific personal entities that regex cannot detect:
family relationships, property locations, employer, account names, etc.

The vocabulary is loaded from `app.config.settings` (env-configurable).
For Phase 3 we ship a sensible default plus a few personal placeholders;
the user can extend it without code changes by editing the JSON file
referenced by `REDACTOR_VOCAB_PATH`.

This pass is intentionally conservative — case-insensitive whole-word /
phrase matching only — to avoid over-redacting.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

from app.gateway.redactor.types import RedactionResult


# Default phrases shipped with the codebase.  These are generic patterns
# that almost any user benefits from.  Personal names / addresses go in
# the user vocabulary file.
_DEFAULT_VOCABULARY: dict[str, list[str]] = {
    "FAMILY_MEMBER": [
        "my mother", "my father", "my mom", "my dad", "my mum",
        "my sister", "my brother", "my husband", "my wife",
        "my son", "my daughter", "my partner", "my boyfriend", "my girlfriend",
    ],
    "INCOME": ["my salary", "my income", "my paycheck", "my wage"],
    "INVESTMENT_ACCOUNT": [
        "my investment account", "my brokerage", "my pension",
        "my isa", "my 401k", "my ira",
    ],
    "PROPERTY_LOCATION": [
        "my flat", "my apartment", "my house", "my home address",
    ],
    "EMPLOYER": ["my company", "my employer", "my workplace"],
}


def load_vocabulary(path: str | None) -> dict[str, list[str]]:
    """Merge default vocabulary with optional user-supplied JSON file."""
    vocab = {k: list(v) for k, v in _DEFAULT_VOCABULARY.items()}
    if path:
        p = Path(path)
        if p.is_file():
            try:
                user_vocab = json.loads(p.read_text(encoding="utf-8"))
                for category, phrases in user_vocab.items():
                    vocab.setdefault(category, []).extend(phrases)
            except (OSError, json.JSONDecodeError):
                # Bad config should never break redaction — silently fall
                # back to defaults.  A logger warning could be added.
                pass
    # Sort phrases longest-first so "my home address" wins over "my home".
    for cat in vocab:
        vocab[cat] = sorted(set(vocab[cat]), key=len, reverse=True)
    return vocab


class VocabularyRedactor:
    name = "vocabulary"

    def __init__(self, vocab_path: str | None = None) -> None:
        self.vocabulary = load_vocabulary(vocab_path)
        self._compiled: list[tuple[str, re.Pattern]] = []
        for category, phrases in self.vocabulary.items():
            for phrase in phrases:
                pat = re.compile(rf"\b{re.escape(phrase)}\b", re.IGNORECASE)
                self._compiled.append((category, pat))

    def redact(self, text: str) -> RedactionResult:
        placeholders: list[tuple[str, str, str]] = []
        seen: dict[str, dict[str, str]] = defaultdict(dict)
        counter: dict[str, int] = defaultdict(int)

        out = text
        for category, pattern in self._compiled:

            def _sub(match: re.Match, _cat: str = category) -> str:
                original = match.group(0)
                key = original.lower()
                if key in seen[_cat]:
                    return seen[_cat][key]
                counter[_cat] += 1
                placeholder = f"[{_cat}_{counter[_cat]}]"
                seen[_cat][key] = placeholder
                placeholders.append((placeholder, original, _cat))
                return placeholder

            out = pattern.sub(_sub, out)

        return RedactionResult(redacted_text=out, placeholders=placeholders)
