"""OCR service — local-only image-to-text via an Ollama vision model.

Used by the Diary OCR endpoint (spec §13 nice-to-have).

Privacy: NEVER calls an external provider. Images are sensitive and must
stay local. The redactor / external-AI gateway is intentionally bypassed
because no external call happens.
"""
from __future__ import annotations

import base64

import httpx

from app.config import settings


class OCRError(RuntimeError):
    """OCR failed (model unavailable, timeout, empty response, etc.)."""


_DEFAULT_PROMPT = (
    "Transcribe the text in this image exactly as written. "
    "Preserve line breaks. Output ONLY the transcribed text — no commentary, "
    "no labels, no markdown."
)


async def ocr_image(image_bytes: bytes, prompt: str | None = None) -> str:
    """Run OCR on `image_bytes` using the configured local Ollama vision model.

    Returns the extracted plain text (may be empty if the image had no text).
    Raises OCRError on transport/model failure.
    """
    if not image_bytes:
        raise OCRError("empty image")

    encoded = base64.b64encode(image_bytes).decode("ascii")
    payload = {
        "model": settings.ocr_model,
        "prompt": prompt or _DEFAULT_PROMPT,
        "images": [encoded],
        "stream": False,
    }

    url = settings.ollama_base_url.rstrip("/") + "/api/generate"
    try:
        async with httpx.AsyncClient(timeout=settings.ocr_timeout_seconds) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as exc:
        raise OCRError(f"ollama vision call failed: {exc}") from exc

    text = (data.get("response") or "").strip()
    return text
