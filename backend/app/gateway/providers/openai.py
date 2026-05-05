"""OpenAI provider — real HTTP implementation (Phase 5).

Uses the Chat Completions endpoint via `httpx` to avoid the official SDK.
Errors map cleanly to `ProviderError`.
"""
from __future__ import annotations

import httpx

from app.config import settings
from app.gateway.cost import actual_cost_gbp
from app.gateway.providers.base import BaseProvider, ProviderError
from app.gateway.schemas import ProviderResult


_API_URL = "https://api.openai.com/v1/chat/completions"


class OpenAIProvider(BaseProvider):
    name = "openai"

    def __init__(
        self,
        api_key: str | None = None,
        *,
        timeout: float | None = None,
    ) -> None:
        self._api_key = api_key if api_key is not None else settings.openai_api_key
        self._timeout = timeout or settings.external_ai_timeout_seconds

    async def generate(
        self,
        prompt: str,
        model: str,
        max_output_tokens: int,
    ) -> ProviderResult:
        if not self._api_key:
            raise ProviderError(
                "OpenAI API key not configured "
                "(set OPENAI_API_KEY in .env to enable OpenAI calls)."
            )

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
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
            raise ProviderError(f"OpenAI network error: {exc}") from exc

        if resp.status_code >= 400:
            try:
                err = resp.json().get("error", {})
                detail = err.get("message") or resp.text
                etype = err.get("type") or "error"
            except ValueError:
                detail = resp.text
                etype = "error"
            raise ProviderError(
                f"OpenAI API {resp.status_code} {etype}: {detail}"
            )

        try:
            data = resp.json()
        except ValueError as exc:
            raise ProviderError(f"OpenAI returned non-JSON response: {exc}") from exc

        text = _extract_text(data)
        usage = data.get("usage") or {}
        input_tokens = int(usage.get("prompt_tokens") or 0)
        output_tokens = int(usage.get("completion_tokens") or 0)

        return ProviderResult(
            text=text,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost_gbp=actual_cost_gbp(
                provider="openai",
                model=model,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
            ),
        )


def _extract_text(data: dict) -> str:
    """Pull the assistant text out of the first choice."""
    choices = data.get("choices") or []
    if not choices:
        return ""
    msg = choices[0].get("message") or {}
    content = msg.get("content")
    if isinstance(content, str):
        return content
    # Some newer responses use a list of parts; fall back gracefully.
    if isinstance(content, list):
        parts: list[str] = []
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                parts.append(part.get("text") or "")
        return "".join(parts)
    return ""
