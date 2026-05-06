"""Cards CRUD endpoints.

Phase 7 deliverable: minimal create / list / get / update / delete on
the `cards` table so the mobile app's Chat → Capture → Boards flow has
real data to talk to.

No auth yet — `user_id` arrives via query/body. JWT will replace this.
Privacy level defaults to NORMAL; callers may set it explicitly.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.enums import (
    CardLevel,
    CardStatus,
    CardType,
    EnergyLevel,
    LifeArea,
    Priority,
    PrivacyLevel,
)
from app.models.card import Card
from app.db import SessionLocal


router = APIRouter(prefix="/cards", tags=["cards"])


async def _embed_card(
    card_id: uuid.UUID,
    user_id: uuid.UUID,
    title: str,
    description: str | None,
) -> None:
    """Background task: embed card text into pgvector."""
    from app.services.embedding_service import embed_entity

    text = title
    if description:
        text = f"{title}\n{description}"
    db = SessionLocal()
    try:
        await embed_entity(db, user_id, "card", card_id, text)
    except Exception:
        pass  # Embedding is best-effort; never block the user
    finally:
        db.close()


# ----------------------------------------------------------------------
# Schemas
# ----------------------------------------------------------------------
class CardOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    parent_id: uuid.UUID | None
    title: str
    description: str | None
    level: str
    type: str
    status: str
    life_area: str | None
    energy_required: str
    priority: str
    privacy_level: str
    estimated_minutes: int | None
    due_date: datetime | None
    moved_count: int
    mission_scores: dict
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None

    class Config:
        from_attributes = True


class CardCreate(BaseModel):
    user_id: uuid.UUID
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    parent_id: uuid.UUID | None = None
    level: CardLevel = CardLevel.TASK
    type: CardType = CardType.TASK
    status: CardStatus = CardStatus.INBOX
    life_area: LifeArea | None = None
    energy_required: EnergyLevel = EnergyLevel.MEDIUM
    priority: Priority = Priority.MEDIUM
    privacy_level: PrivacyLevel = PrivacyLevel.NORMAL
    estimated_minutes: int | None = None
    due_date: datetime | None = None


class CardUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    status: CardStatus | None = None
    level: CardLevel | None = None
    type: CardType | None = None
    life_area: LifeArea | None = None
    energy_required: EnergyLevel | None = None
    priority: Priority | None = None
    privacy_level: PrivacyLevel | None = None
    estimated_minutes: int | None = None
    due_date: datetime | None = None
    parent_id: uuid.UUID | None = None


# ----------------------------------------------------------------------
# Endpoints
# ----------------------------------------------------------------------
@router.get("", response_model=list[CardOut])
def list_cards(
    user_id: uuid.UUID = Query(...),
    status_filter: CardStatus | None = Query(default=None, alias="status"),
    card_type: CardType | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[Card]:
    stmt = select(Card).where(Card.user_id == user_id)
    if status_filter is not None:
        stmt = stmt.where(Card.status == status_filter)
    if card_type is not None:
        stmt = stmt.where(Card.type == card_type)
    stmt = stmt.order_by(Card.created_at.desc())
    return list(db.execute(stmt).scalars())


@router.post("", response_model=CardOut, status_code=status.HTTP_201_CREATED)
async def create_card(
    payload: CardCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> Card:
    card = Card(
        user_id=payload.user_id,
        parent_id=payload.parent_id,
        title=payload.title,
        description=payload.description,
        level=payload.level,
        type=payload.type,
        status=payload.status,
        life_area=payload.life_area,
        energy_required=payload.energy_required,
        priority=payload.priority,
        privacy_level=payload.privacy_level,
        estimated_minutes=payload.estimated_minutes,
        due_date=payload.due_date,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    background_tasks.add_task(_embed_card, card.id, card.user_id, card.title, card.description)
    return card


# ----------------------------------------------------------------------
# Goal tree (spec §3 hierarchy: Vision → Goal → Project → Task)
# ----------------------------------------------------------------------
class CardTreeNode(BaseModel):
    """A card with its children eagerly nested.

    Mirrors `CardOut` exactly + `children`. We re-declare instead of
    extending so the response shape stays explicit in OpenAPI.
    """

    id: uuid.UUID
    parent_id: uuid.UUID | None
    title: str
    description: str | None
    level: str
    type: str
    status: str
    life_area: str | None
    energy_required: str
    priority: str
    moved_count: int
    completed_at: datetime | None
    children: list["CardTreeNode"] = Field(default_factory=list)


# Tree levels map to spec §3. Anything below "project" is treated as
# leaf detail and excluded from the tree view (those still show up on
# Boards / Today). Adjustable via query param.
_DEFAULT_TREE_LEVELS = (
    CardLevel.VISION,
    CardLevel.GOAL,
    CardLevel.PROJECT,
    CardLevel.MILESTONE,
)


@router.get("/tree", response_model=list[CardTreeNode])
def get_card_tree(
    user_id: uuid.UUID = Query(...),
    include_tasks: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> list[CardTreeNode]:
    """Return the user's goal tree as a list of root nodes.

    A "root" is any card whose `parent_id` is null. Children are nested
    via `parent_id`. By default only Vision/Goal/Project/Milestone are
    included; pass `include_tasks=true` to fold tasks in as leaves.
    """
    levels = list(_DEFAULT_TREE_LEVELS)
    if include_tasks:
        levels.extend([CardLevel.TASK, CardLevel.SUBTASK, CardLevel.FOCUS_BLOCK])

    stmt = (
        select(Card)
        .where(Card.user_id == user_id)
        .where(Card.level.in_([lvl.value for lvl in levels]))
        .order_by(Card.created_at.asc())
    )
    cards = list(db.execute(stmt).scalars())
    return _build_tree(cards)


def _build_tree(cards: list[Card]) -> list[CardTreeNode]:
    """Pure helper — turn a flat list of cards into nested CardTreeNodes.

    Cards whose `parent_id` is missing from the input set become roots
    (this includes orphans whose parent is at a level that was filtered
    out — surfacing them prevents accidental data hiding).
    """
    by_id: dict[uuid.UUID, CardTreeNode] = {
        c.id: CardTreeNode(
            id=c.id,
            parent_id=c.parent_id,
            title=c.title,
            description=c.description,
            level=c.level if isinstance(c.level, str) else c.level.value,
            type=c.type if isinstance(c.type, str) else c.type.value,
            status=c.status if isinstance(c.status, str) else c.status.value,
            life_area=(
                c.life_area
                if c.life_area is None or isinstance(c.life_area, str)
                else c.life_area.value
            ),
            energy_required=(
                c.energy_required
                if isinstance(c.energy_required, str)
                else c.energy_required.value
            ),
            priority=c.priority if isinstance(c.priority, str) else c.priority.value,
            moved_count=c.moved_count or 0,
            completed_at=c.completed_at,
        )
        for c in cards
    }
    roots: list[CardTreeNode] = []
    for c in cards:
        node = by_id[c.id]
        if c.parent_id and c.parent_id in by_id:
            by_id[c.parent_id].children.append(node)
        else:
            roots.append(node)
    return roots


class SearchResult(BaseModel):
    card: CardOut
    distance: float


@router.get("/search", response_model=list[SearchResult])
async def search_cards(
    user_id: uuid.UUID = Query(...),
    q: str = Query(..., min_length=1, max_length=500),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
) -> list[SearchResult]:
    """Semantic search over cards using pgvector embeddings."""
    from app.services.embedding_service import search_similar

    results = await search_similar(
        db, user_id=user_id, query_text=q, entity_type="card", limit=limit
    )
    if not results:
        return []

    # Fetch matching cards
    card_ids = [uuid.UUID(r["entity_id"]) for r in results]
    cards_map: dict[uuid.UUID, Card] = {}
    for card_id in card_ids:
        card = db.get(Card, card_id)
        if card:
            cards_map[card.id] = card

    out: list[SearchResult] = []
    for r in results:
        cid = uuid.UUID(r["entity_id"])
        if cid in cards_map:
            out.append(SearchResult(card=cards_map[cid], distance=r["distance"]))
    return out


@router.get("/{card_id}", response_model=CardOut)
def get_card(card_id: uuid.UUID, db: Session = Depends(get_db)) -> Card:
    card = db.get(Card, card_id)
    if card is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "card not found")
    return card


@router.patch("/{card_id}", response_model=CardOut)
async def update_card(
    card_id: uuid.UUID,
    payload: CardUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> Card:
    card = db.get(Card, card_id)
    if card is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "card not found")

    fields = payload.model_dump(exclude_unset=True)
    apply_status_transition(card, fields.get("status"))

    for key, value in fields.items():
        setattr(card, key, value)

    db.commit()
    db.refresh(card)
    # Re-embed if title or description changed
    if "title" in fields or "description" in fields:
        background_tasks.add_task(_embed_card, card.id, card.user_id, card.title, card.description)
    return card


def apply_status_transition(card: Card, new_status: CardStatus | None) -> None:
    """Mutate `card` to reflect a status transition, if any.

    Pure helper so it can be unit-tested without a DB:
      * Bumps `moved_count` when status actually changes
      * Stamps `completed_at` on entry to DONE
      * Clears `completed_at` on exit from DONE

    Does not write `card.status` itself — the caller handles that
    (so we don't have to think about ordering with other field updates).
    """
    if new_status is None or new_status == card.status:
        return
    card.moved_count = (card.moved_count or 0) + 1
    if new_status == CardStatus.DONE and card.completed_at is None:
        card.completed_at = datetime.now(timezone.utc)
    elif new_status != CardStatus.DONE and card.completed_at is not None:
        card.completed_at = None


@router.delete("/{card_id}")
def delete_card(card_id: uuid.UUID, db: Session = Depends(get_db)) -> Response:
    card = db.get(Card, card_id)
    if card is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "card not found")
    db.delete(card)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
