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

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
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


router = APIRouter(prefix="/cards", tags=["cards"])


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
    db: Session = Depends(get_db),
) -> list[Card]:
    stmt = select(Card).where(Card.user_id == user_id)
    if status_filter is not None:
        stmt = stmt.where(Card.status == status_filter)
    stmt = stmt.order_by(Card.created_at.desc())
    return list(db.execute(stmt).scalars())


@router.post("", response_model=CardOut, status_code=status.HTTP_201_CREATED)
def create_card(payload: CardCreate, db: Session = Depends(get_db)) -> Card:
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
    return card


@router.get("/{card_id}", response_model=CardOut)
def get_card(card_id: uuid.UUID, db: Session = Depends(get_db)) -> Card:
    card = db.get(Card, card_id)
    if card is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "card not found")
    return card


@router.patch("/{card_id}", response_model=CardOut)
def update_card(
    card_id: uuid.UUID,
    payload: CardUpdate,
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
