"""Drafts API \u2014 chat redesign slice 3.

Endpoints:
    GET    /drafts?state=new          \u2014 list current user's drafts
    POST   /drafts/{id}/accept        \u2014 mark accepted (placeholder for card-conversion)
    POST   /drafts/{id}/dismiss       \u2014 hard-dismiss a draft
    POST   /drafts/{id}/archive       \u2014 archive as insight (\u00a75 intake filter)

All endpoints require a JWT. A user can only see / mutate their own
drafts \u2014 cross-user access returns 404 (we never confirm existence of
another user's draft).
"""
from __future__ import annotations

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models.draft import Draft
from app.models.user import User


router = APIRouter(prefix="/drafts", tags=["drafts"])


DraftState = Literal["new", "accepted", "dismissed", "archived_insight"]


class DraftRead(BaseModel):
    id: uuid.UUID
    title: str
    kind: str
    state: DraftState
    life_area: str | None = None
    confidence: float
    reason: str | None = None
    source_text: str


def _row_to_read(row: Draft) -> DraftRead:
    return DraftRead(
        id=row.id,
        title=row.title,
        kind=row.kind,
        state=row.state,  # type: ignore[arg-type]
        life_area=row.life_area,
        confidence=row.confidence,
        reason=row.reason,
        source_text=row.source_text,
    )


@router.get("", response_model=list[DraftRead])
def list_drafts(
    state: DraftState | None = Query(default="new"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DraftRead]:
    stmt = select(Draft).where(Draft.user_id == current_user.id)
    if state is not None:
        stmt = stmt.where(Draft.state == state)
    stmt = stmt.order_by(Draft.created_at.desc()).limit(200)
    rows = db.execute(stmt).scalars().all()
    return [_row_to_read(r) for r in rows]


def _load_owned(
    draft_id: uuid.UUID, db: Session, current_user: User
) -> Draft:
    row = db.get(Draft, draft_id)
    if row is None or row.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="draft not found")
    return row


def _transition(
    draft_id: uuid.UUID,
    new_state: DraftState,
    db: Session,
    current_user: User,
) -> DraftRead:
    row = _load_owned(draft_id, db, current_user)
    if row.state != "new":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"draft already {row.state}",
        )
    row.state = new_state
    db.commit()
    db.refresh(row)
    return _row_to_read(row)


@router.post("/{draft_id}/accept", response_model=DraftRead)
def accept_draft(
    draft_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DraftRead:
    # Slice 3 keeps this as a state flip. Slice 3.1 will convert
    # the draft into a real Card via the existing /cards endpoint.
    return _transition(draft_id, "accepted", db, current_user)


@router.post("/{draft_id}/dismiss", response_model=DraftRead)
def dismiss_draft(
    draft_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DraftRead:
    return _transition(draft_id, "dismissed", db, current_user)


@router.post("/{draft_id}/archive", response_model=DraftRead)
def archive_draft(
    draft_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DraftRead:
    """Spec \u00a75 intake filter \u2014 'archive as insight'."""
    return _transition(draft_id, "archived_insight", db, current_user)
