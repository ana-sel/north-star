"""Embedding service — spec §4/§6 vector search via pgvector.

Embeds card text using Ollama and stores vectors in the embeddings table.
Provides semantic search over cards.
"""
from __future__ import annotations

import hashlib
import uuid

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.gateway.providers.ollama import OllamaProvider, ProviderError
from app.models.embedding import EMBEDDING_DIM, Embedding

DEFAULT_MODEL = "nomic-embed-text"


def _text_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


async def embed_entity(
    db: Session,
    user_id: uuid.UUID,
    entity_type: str,
    entity_id: uuid.UUID,
    text: str,
    model: str = DEFAULT_MODEL,
) -> Embedding | None:
    """Embed text for an entity. Skips if text unchanged (hash dedup)."""
    if not text.strip():
        return None

    new_hash = _text_hash(text)

    # Check if unchanged
    existing = db.execute(
        select(Embedding).where(
            Embedding.user_id == user_id,
            Embedding.entity_type == entity_type,
            Embedding.entity_id == entity_id,
        )
    ).scalar_one_or_none()

    if existing and existing.text_hash == new_hash:
        return existing  # already up-to-date

    # Generate embedding
    provider = OllamaProvider()
    try:
        vector = await provider.embed(text, model=model)
    except ProviderError:
        return None

    # Pad/truncate to EMBEDDING_DIM if model returns different size
    if len(vector) < EMBEDDING_DIM:
        vector = vector + [0.0] * (EMBEDDING_DIM - len(vector))
    elif len(vector) > EMBEDDING_DIM:
        vector = vector[:EMBEDDING_DIM]

    if existing:
        existing.text_hash = new_hash
        existing.embedding = vector
        existing.model = model
        db.commit()
        db.refresh(existing)
        return existing
    else:
        emb = Embedding(
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            text_hash=new_hash,
            embedding=vector,
            model=model,
        )
        db.add(emb)
        db.commit()
        db.refresh(emb)
        return emb


async def search_similar(
    db: Session,
    user_id: uuid.UUID,
    query_text: str,
    entity_type: str | None = None,
    limit: int = 10,
    model: str = DEFAULT_MODEL,
) -> list[dict]:
    """Semantic search — embed query then find closest vectors."""
    if not query_text.strip():
        return []

    provider = OllamaProvider()
    try:
        query_vector = await provider.embed(query_text, model=model)
    except ProviderError:
        return []

    if len(query_vector) < EMBEDDING_DIM:
        query_vector = query_vector + [0.0] * (EMBEDDING_DIM - len(query_vector))
    elif len(query_vector) > EMBEDDING_DIM:
        query_vector = query_vector[:EMBEDDING_DIM]

    vector_str = "[" + ",".join(str(v) for v in query_vector) + "]"

    # Build raw SQL for cosine distance (pgvector <=> operator)
    where_clauses = ["user_id = :uid"]
    params: dict = {"uid": user_id, "vec": vector_str, "lim": limit}
    if entity_type:
        where_clauses.append("entity_type = :etype")
        params["etype"] = entity_type

    where_sql = " AND ".join(where_clauses)
    sql = text(
        f"SELECT entity_type, entity_id, "
        f"(embedding <=> :vec::vector) AS distance "
        f"FROM embeddings WHERE {where_sql} "
        f"ORDER BY distance ASC LIMIT :lim"
    )

    rows = db.execute(sql, params).fetchall()
    return [
        {
            "entity_type": row.entity_type,
            "entity_id": str(row.entity_id),
            "distance": float(row.distance),
        }
        for row in rows
    ]
