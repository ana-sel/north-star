"""Energy log API — spec §9 Today screen energy history."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.energy import EnergyLog


router = APIRouter(prefix="/energy", tags=["energy"])


EnergyLevelLiteral = Literal["low", "medium", "high"]


class EnergyLogOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    level: str
    notes: str | None
    logged_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class EnergyLogCreate(BaseModel):
    user_id: uuid.UUID
    level: EnergyLevelLiteral
    notes: str | None = None


@router.post("", response_model=EnergyLogOut, status_code=status.HTTP_201_CREATED)
def log_energy(payload: EnergyLogCreate, db: Session = Depends(get_db)) -> EnergyLog:
    row = EnergyLog(
        user_id=payload.user_id,
        level=payload.level,
        notes=payload.notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("", response_model=list[EnergyLogOut])
def list_energy(
    user_id: uuid.UUID = Query(...),
    days: int = Query(default=14, ge=1, le=365),
    db: Session = Depends(get_db),
) -> list[EnergyLog]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    stmt = (
        select(EnergyLog)
        .where(EnergyLog.user_id == user_id, EnergyLog.logged_at >= since)
        .order_by(EnergyLog.logged_at.desc())
    )
    return list(db.execute(stmt).scalars())


@router.get("/latest", response_model=EnergyLogOut | None)
def latest_energy(
    user_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
) -> EnergyLog | None:
    stmt = (
        select(EnergyLog)
        .where(EnergyLog.user_id == user_id)
        .order_by(EnergyLog.logged_at.desc())
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()
