"""Shared types for the redactor package."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class RedactionResult:
    """Outcome of a redaction pass.

    - `redacted_text`  : text with originals replaced by placeholders.
    - `placeholders`   : ordered list of (placeholder, original, category)
                         tuples.  `original` is in-memory only — it is
                         dropped before audit logging.
    """

    redacted_text: str
    placeholders: list[tuple[str, str, str]] = field(default_factory=list)

    @property
    def map_for_audit(self) -> dict[str, str]:
        """Return the safe-to-log map: placeholder → category only."""
        return {ph: cat for ph, _orig, cat in self.placeholders}

    @property
    def restoration_map(self) -> dict[str, str]:
        """In-memory placeholder → original. Never persist this."""
        return {ph: orig for ph, orig, _cat in self.placeholders}
