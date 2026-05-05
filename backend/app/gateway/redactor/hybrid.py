"""Composes regex + vocabulary + (optional) semantic redaction passes."""
from __future__ import annotations

from app.gateway.redactor.regex_redactor import RegexRedactor
from app.gateway.redactor.semantic import OllamaSemanticRedactor
from app.gateway.redactor.types import RedactionResult
from app.gateway.redactor.vocabulary import VocabularyRedactor


class HybridRedactor:
    """Run all configured redaction passes in order, accumulating placeholders."""

    name = "hybrid"

    def __init__(
        self,
        *,
        regex: RegexRedactor | None = None,
        vocabulary: VocabularyRedactor | None = None,
        semantic: OllamaSemanticRedactor | None = None,
    ) -> None:
        self.regex = regex or RegexRedactor()
        self.vocabulary = vocabulary or VocabularyRedactor()
        self.semantic = semantic or OllamaSemanticRedactor(enabled=False)

    async def redact(self, text: str) -> RedactionResult:
        all_placeholders: list[tuple[str, str, str]] = []

        r1 = self.regex.redact(text)
        all_placeholders.extend(r1.placeholders)

        r2 = self.vocabulary.redact(r1.redacted_text)
        all_placeholders.extend(r2.placeholders)

        r3 = await self.semantic.redact(r2.redacted_text)
        all_placeholders.extend(r3.placeholders)

        return RedactionResult(
            redacted_text=r3.redacted_text,
            placeholders=all_placeholders,
        )
