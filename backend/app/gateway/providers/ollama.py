"""Local Ollama provider — the default for everything sensitive."""
from __future__ import annotations

from decimal import Decimal

import httpx

from app.config import settings
from app.gateway.providers.base import BaseProvider, ProviderError
from app.gateway.schemas import ProviderResult


class OllamaProvider(BaseProvider):
    name = "ollama"

    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = (base_url or settings.ollama_base_url).rstrip("/")

    async def generate(
        self,
        prompt: str,
        model: str,
        max_output_tokens: int,
    ) -> ProviderResult:
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {"num_predict": max_output_tokens},
        }
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPError as exc:
            raise ProviderError(f"Ollama call failed: {exc}") from exc

        text = data.get("response", "")
        # Ollama returns prompt_eval_count + eval_count when available.
        input_tokens = int(data.get("prompt_eval_count") or 0)
        output_tokens = int(data.get("eval_count") or 0)
        return ProviderResult(
            text=text,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost_gbp=Decimal("0"),  # local => zero cost
        )
