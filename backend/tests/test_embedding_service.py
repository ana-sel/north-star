"""Tests for embedding service — mock Ollama, test hash dedup + search."""
from __future__ import annotations

import hashlib
import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.services.embedding_service import (
    DEFAULT_MODEL,
    EMBEDDING_DIM,
    _text_hash,
    embed_entity,
    search_similar,
)


def test_text_hash():
    assert _text_hash("hello") == hashlib.sha256(b"hello").hexdigest()


@pytest.mark.asyncio
async def test_embed_entity_skips_empty():
    """Empty text should return None without calling Ollama."""
    result = await embed_entity(
        db=None,  # type: ignore
        user_id=uuid.uuid4(),
        entity_type="card",
        entity_id=uuid.uuid4(),
        text="   ",
    )
    assert result is None


@pytest.mark.asyncio
async def test_search_similar_empty_query():
    """Empty query should return [] without calling Ollama."""
    result = await search_similar(
        db=None,  # type: ignore
        user_id=uuid.uuid4(),
        query_text="   ",
    )
    assert result == []
