"""Hybrid redactor package.

Composition order (each pass runs on the output of the previous):

    raw text
       ↓ RegexRedactor      — emails, phones, URLs, IBAN, card numbers, money
       ↓ VocabularyRedactor — user-supplied names / addresses / locations
       ↓ OllamaSemanticRedactor (optional) — catches what rules can't
       ↓ redacted text  + redaction_map (placeholder → category)

The redaction map stored in audit logs contains ONLY placeholder→category,
never placeholder→original.  Originals stay in process memory and are
discarded after the gateway call returns.
"""

from app.gateway.redactor.types import RedactionResult
from app.gateway.redactor.hybrid import HybridRedactor
from app.gateway.redactor.regex_redactor import RegexRedactor
from app.gateway.redactor.vocabulary import VocabularyRedactor
from app.gateway.redactor.semantic import OllamaSemanticRedactor

__all__ = [
    "RedactionResult",
    "HybridRedactor",
    "RegexRedactor",
    "VocabularyRedactor",
    "OllamaSemanticRedactor",
]
