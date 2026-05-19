"""OCR endpoint smoke tests — no real Ollama call (mocked)."""
from __future__ import annotations

import io
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_diary_ocr_rejects_non_image():
    resp = client.post(
        "/diary/ocr",
        files={"image": ("note.txt", io.BytesIO(b"hello"), "text/plain")},
    )
    assert resp.status_code == 400


def test_diary_ocr_rejects_empty_file():
    resp = client.post(
        "/diary/ocr",
        files={"image": ("empty.png", io.BytesIO(b""), "image/png")},
    )
    assert resp.status_code == 400


@patch("app.api.diary.ocr_image", new_callable=AsyncMock)
def test_diary_ocr_returns_text(mock_ocr):
    mock_ocr.return_value = "Hello world"
    fake_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32  # minimal-looking bytes
    resp = client.post(
        "/diary/ocr",
        files={"image": ("note.png", io.BytesIO(fake_png), "image/png")},
    )
    assert resp.status_code == 200
    assert resp.json() == {"text": "Hello world"}
    mock_ocr.assert_awaited_once()
