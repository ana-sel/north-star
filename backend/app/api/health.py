"""Health log API — spec §9 Health screen.

Tracks sleep, weight, calories, mood, etc. One row per user per day
(unique constraint enforced at DB level). Upsert via `pg_insert.on_conflict`.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.db import get_db
from app.enums import PrivacyLevel
from app.models.health_log import HealthLog


router = APIRouter(prefix="/health", tags=["health"])


class HealthLogOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    log_date: date
    sleep_minutes: int | None
    weight_kg: float | None
    calories: int | None
    protein_g: int | None
    steps: int | None
    energy: int | None
    mood: int | None
    notes: dict
    privacy_level: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HealthLogUpsert(BaseModel):
    user_id: uuid.UUID
    log_date: date | None = None
    sleep_minutes: int | None = None
    weight_kg: float | None = None
    calories: int | None = None
    protein_g: int | None = None
    steps: int | None = None
    energy: int | None = None
    mood: int | None = None
    notes: dict | None = None


@router.get("", response_model=list[HealthLogOut])
def list_health_logs(
    user_id: uuid.UUID = Query(...),
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
) -> list[HealthLog]:
    since = date.today() - timedelta(days=days)
    stmt = (
        select(HealthLog)
        .where(HealthLog.user_id == user_id, HealthLog.log_date >= since)
        .order_by(HealthLog.log_date.desc())
    )
    return list(db.execute(stmt).scalars())


@router.get("/today", response_model=HealthLogOut | None)
def health_today(
    user_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
) -> HealthLog | None:
    stmt = select(HealthLog).where(
        HealthLog.user_id == user_id, HealthLog.log_date == date.today()
    )
    return db.execute(stmt).scalar_one_or_none()


@router.post("", response_model=HealthLogOut, status_code=status.HTTP_201_CREATED)
def upsert_health_log(
    payload: HealthLogUpsert, db: Session = Depends(get_db)
) -> HealthLog:
    log_date = payload.log_date or date.today()
    values = {
        "user_id": payload.user_id,
        "log_date": log_date,
        "sleep_minutes": payload.sleep_minutes,
        "weight_kg": payload.weight_kg,
        "calories": payload.calories,
        "protein_g": payload.protein_g,
        "steps": payload.steps,
        "energy": payload.energy,
        "mood": payload.mood,
        "notes": payload.notes if payload.notes is not None else {},
        "privacy_level": PrivacyLevel.SENSITIVE.value,
    }
    # Only update fields the caller actually set (so a partial check-in
    # doesn't wipe yesterday's weight when only mood is being saved).
    update_fields = {
        k: v
        for k, v in values.items()
        if k not in ("user_id", "log_date", "privacy_level")
        and getattr(payload, k, None) is not None
    }
    stmt = pg_insert(HealthLog).values(**values)
    if update_fields:
        stmt = stmt.on_conflict_do_update(
            constraint="uq_health_logs_user_date",
            set_=update_fields,
        )
    else:
        stmt = stmt.on_conflict_do_nothing(
            constraint="uq_health_logs_user_date"
        )
    stmt = stmt.returning(HealthLog.id)
    log_id = db.execute(stmt).scalar_one_or_none()
    if log_id is None:
        # No-op insert (existing row, no fields to update) — fetch existing.
        existing = db.execute(
            select(HealthLog).where(
                HealthLog.user_id == payload.user_id,
                HealthLog.log_date == log_date,
            )
        ).scalar_one()
        db.commit()
        return existing
    db.commit()
    row = db.execute(
        select(HealthLog).where(HealthLog.id == log_id)
    ).scalar_one()
    return row
