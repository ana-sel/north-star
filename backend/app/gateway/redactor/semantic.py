"""Optional Ollama-based semantic redactor.

The local LLM is asked to identify any remaining personal references
(names of people / cities / employers / accounts) that the regex and
vocabulary passes missed, and return a strict JSON list of spans.

Design rules:

  * Default OFF — only enabled when `enabled=True`.
  * Local-only: this pass exists precisely to *avoid* leaking data, so
    it must never be served by an external provider.
  * Conservative: if the model output is malformed, we return the input
    unchanged rather than risk corrupting a prompt.
  * Idempotent w.r.t. existing placeholders — the prompt instructs the
    model to ignore tokens of the form `[CATEGORY_N]`.
"""
from __future__ import annotations

import json
import logging
import re
from collections import defaultdict

import httpx

from app.config import settings
from app.gateway.redactor.types import RedactionResult

logger = logging.getLogger(__name__)


_PROMPT_TEMPLATE = """You are a privacy redaction assistant. Identify
spans in the following text that are personal data not yet redacted.
Categories you may use:
  PERSON_NAME, CITY, COUNTRY, ADDRESS, ORGANISATION, ACCOUNT_NAME, OTHER_PII

Rules:
- Ignore tokens of the form [CATEGORY_NUMBER] — they are already redacted.
- Do NOT redact common words, generic concepts, or task descriptions.
- Return STRICT JSON only, in this shape:
  {{"spans": [{{"text": "<exact substring>", "category": "<CATEGORY>"}}]}}
- If nothing needs redacting, return: {{"spans": []}}.

TEXT:
---
{text}
---
JSON:"""


_PLACEHOLDER_RE = re.compile(r"\[[A-Z_]+_\d+\]")


class OllamaSemanticRedactor:
    name = "semantic"

    def __init__(
        self,
        *,
        enabled: bool = False,
        model: str = "llama3.2",
        base_url: str | None = None,
        timeout_seconds: float = 30.0,
    ) -> None:
        self.enabled = enabled
        self.model = model
        self.base_url = (base_url or settings.ollama_base_url).rstrip("/")
        self.timeout_seconds = timeout_seconds

    async def redact(self, text: str) -> RedactionResult:
        if not self.enabled or not text.strip():
            return RedactionResult(redacted_text=text, placeholders=[])

        try:
            spans = await self._call_model(text)
        except (httpx.HTTPError, ValueError, json.JSONDecodeError) as exc:
            logger.warning("Semantic redactor failed; falling back: %s", exc)
            return RedactionResult(redacted_text=text, placeholders=[])

        return self._apply_spans(text, spans)

    # --------------------------------------------------------------
    async def _call_model(self, text: str) -> list[dict]:
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": _PROMPT_TEMPLATE.format(text=text),
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.0, "num_predict": 512},
        }
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        raw = data.get("response", "").strip()
        if not raw:
            return []
        parsed = json.loads(raw)
        spans = parsed.get("spans") if isinstance(parsed, dict) else None
        return spans if isinstance(spans, list) else []

    @staticmethod
    def _apply_spans(text: str, spans: list[dict]) -> RedactionResult:
        placeholders: list[tuple[str, str, str]] = []
        seen: dict[str, dict[str, str]] = defaultdict(dict)
        counter: dict[str, int] = defaultdict(int)

        # Apply longest spans first to avoid partial overlaps.
        spans = [
            s for s in spans
            if isinstance(s, dict)
            and isinstance(s.get("text"), str)
            and isinstance(s.get("category"), str)
            and s["text"].strip()
        ]
        spans.sort(key=lambda s: len(s["text"]), reverse=True)

        out = text
        for span in spans:
            original = span["text"]
            category = span["category"].upper().replace(" ", "_")
            # Refuse to redact if the span is itself a placeholder pattern.
            if _PLACEHOLDER_RE.fullmatch(original):
                continue
            if original in seen[category]:
                placeholder = seen[category][original]
            else:
                counter[category] += 1
                placeholder = f"[{category}_{counter[category]}]"
                seen[category][original] = placeholder
                placeholders.append((placeholder, original, category))
            out = out.replace(original, placeholder)

        return RedactionResult(redacted_text=out, placeholders=placeholders)
