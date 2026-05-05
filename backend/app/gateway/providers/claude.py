"""Anthropic Claude provider — real HTTP implementation (Phase 5).

Talks to the Anthropic Messages API directly via `httpx` so we avoid
adding the official SDK as a dependency.

Privacy invariants:
  * Only the redacted prompt prepared by the gateway is sent.
  * The API key is read once from settings; it is never logged.
  * Network errors and 4xx/5xx responses are converted into
    `ProviderError` so the gateway records `provider_error` cleanly.
"""
from __future__ import annotations

import httpx

from app.config import settings
from app.gateway.cost import actual_cost_gbp
from app.gateway.providers.base import BaseProvider, ProviderError
from app.gateway.schemas import ProviderResult


_API_URL = "https://api.anthropic.com/v1/messages"
_API_VERSION = "2023-06-01"


class ClaudeProvider(BaseProvider):
    name = "claude"

    def __init__(
        self,
        api_key: str | None = None,
        *,
        timeout: float | None = None,
    ) -> None:
        # Resolve the key lazily so missing config raises only when the
        # provider is actually used (not at import time).
        self._api_key = api_key if api_key is not None else settings.anthropic_api_key
        self._timeout = timeout or settings.external_ai_timeout_seconds

    async def generate(
        self,
        prompt: str,
        model: str,
        max_output_tokens: int,
    ) -> ProviderResult:
        if not self._api_key:
            raise ProviderError(
                "Anthropic API key not configured "
                "(set ANTHROPIC_API_KEY in .env to enable Claude calls)."
            )

        headers = {
            "x-api-key": self._api_key,
            "anthropic-version": _API_VERSION,
            "content-type": "application/json",
        }
        payload = {
            "model": model,
            "max_tokens": max_output_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(_API_URL, headers=headers, json=payload)
        except httpx.HTTPError as exc:
            raise ProviderError(f"Claude network error: {exc}") from exc

        if resp.status_code >= 400:
            try:
                err = resp.json().get("error", {})
                detail = err.get("message") or resp.text
                etype = err.get("type") or "error"
            except ValueError:
                detail = resp.text
                etype = "error"
            raise ProviderError(
                f"Claude API {resp.status_code} {etype}: {detail}"
            )

        try:
            data = resp.json()
        except ValueError as exc:
            raise ProviderError(f"Claude returned non-JSON response: {exc}") from exc

        text = _extract_text(data)
        usage = data.get("usage") or {}
        input_tokens = int(usage.get("input_tokens") or 0)
        output_tokens = int(usage.get("output_tokens") or 0)

        return ProviderResult(
            text=text,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost_gbp=actual_cost_gbp(
                provider="claude",
                model=model,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
            ),
        )


def _extract_text(data: dict) -> str:
    """Pull plain text out of Claude's `content` blocks."""
    blocks = data.get("content") or []
    parts: list[str] = []
    for block in blocks:
        if isinstance(block, dict) and block.get("type") == "text":
            parts.append(block.get("text") or "")
    return "".join(parts)
