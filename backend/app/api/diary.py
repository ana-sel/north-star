"""Diary API — spec §9 Diary screen.

Dedicated CRUD for diary_entries table. Privacy defaults to SENSITIVE.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.enums import PrivacyLevel
from app.models.diary_entry import DiaryEntry


router = APIRouter(prefix="/diary", tags=["diary"])


class DiaryEntryOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str | None
    body: str
    mood: str | None
    privacy_level: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DiaryEntryCreate(BaseModel):
    user_id: uuid.UUID
    title: str | None = None
    body: str = Field(..., min_length=1, max_length=50_000)
    mood: str | None = Field(default=None, max_length=64)


class DiaryEntryUpdate(BaseModel):
    title: str | None = None
    body: str | None = Field(default=None, min_length=1, max_length=50_000)
    mood: str | None = Field(default=None, max_length=64)


@router.get("", response_model=list[DiaryEntryOut])
def list_diary(
    user_id: uuid.UUID = Query(...),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[DiaryEntry]:
    stmt = (
        select(DiaryEntry)
        .where(DiaryEntry.user_id == user_id)
        .order_by(DiaryEntry.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.execute(stmt).scalars())


@router.post("", response_model=DiaryEntryOut, status_code=status.HTTP_201_CREATED)
def create_diary_entry(
    payload: DiaryEntryCreate, db: Session = Depends(get_db)
) -> DiaryEntry:
    entry = DiaryEntry(
        user_id=payload.user_id,
        title=payload.title,
        body=payload.body,
        mood=payload.mood,
        privacy_level=PrivacyLevel.SENSITIVE,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/{entry_id}", response_model=DiaryEntryOut)
def get_diary_entry(
    entry_id: uuid.UUID, db: Session = Depends(get_db)
) -> DiaryEntry:
    entry = db.get(DiaryEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Diary entry not found")
    return entry


@router.patch("/{entry_id}", response_model=DiaryEntryOut)
def update_diary_entry(
    entry_id: uuid.UUID,
    payload: DiaryEntryUpdate,
    db: Session = Depends(get_db),
) -> DiaryEntry:
    entry = db.get(DiaryEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Diary entry not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_diary_entry(
    entry_id: uuid.UUID, db: Session = Depends(get_db)
) -> Response:
    entry = db.get(DiaryEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Diary entry not found")
    db.delete(entry)
    db.commit()
    return Response(status_code=204)
