"""Habits API — spec §5.6.

Habits are tracked separately from Kanban cards. One log row per habit
per day; check-in is upsert-by-(habit_id, log_date).
"""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.db import get_db
from app.enums import PrivacyLevel
from app.models.habit import HABIT_KINDS, Habit, HabitLog


router = APIRouter(prefix="/habits", tags=["habits"])


HabitKind = Literal["yes_no", "number", "scale", "time", "text"]


# ----------------------------------------------------------------------
# Schemas
# ----------------------------------------------------------------------
class HabitOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    kind: str
    target_value: float | None
    target_unit: str | None
    schedule: str
    active: bool
    privacy_level: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HabitCreate(BaseModel):
    user_id: uuid.UUID
    title: str = Field(min_length=1, max_length=200)
    kind: HabitKind = "yes_no"
    target_value: float | None = None
    target_unit: str | None = Field(default=None, max_length=32)
    schedule: str = Field(default="daily", max_length=32)
    privacy_level: PrivacyLevel = PrivacyLevel.NORMAL


class HabitUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    kind: HabitKind | None = None
    target_value: float | None = None
    target_unit: str | None = Field(default=None, max_length=32)
    schedule: str | None = Field(default=None, max_length=32)
    active: bool | None = None
    privacy_level: PrivacyLevel | None = None


class HabitLogOut(BaseModel):
    id: uuid.UUID
    habit_id: uuid.UUID
    user_id: uuid.UUID
    log_date: date
    value_bool: bool | None
    value_number: float | None
    value_text: str | None
    notes: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class HabitCheckIn(BaseModel):
    user_id: uuid.UUID
    log_date: date | None = None  # defaults to today if omitted
    value_bool: bool | None = None
    value_number: float | None = None
    value_text: str | None = None
    notes: str | None = Field(default=None, max_length=1000)


# ----------------------------------------------------------------------
# Endpoints — habits
# ----------------------------------------------------------------------
@router.get("", response_model=list[HabitOut])
def list_habits(
    user_id: uuid.UUID = Query(...),
    include_inactive: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> list[Habit]:
    stmt = select(Habit).where(Habit.user_id == user_id)
    if not include_inactive:
        stmt = stmt.where(Habit.active.is_(True))
    stmt = stmt.order_by(Habit.created_at.asc())
    return list(db.execute(stmt).scalars())


@router.post("", response_model=HabitOut, status_code=status.HTTP_201_CREATED)
def create_habit(payload: HabitCreate, db: Session = Depends(get_db)) -> Habit:
    if payload.kind not in HABIT_KINDS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid kind")
    habit = Habit(
        user_id=payload.user_id,
        title=payload.title,
        kind=payload.kind,
        target_value=payload.target_value,
        target_unit=payload.target_unit,
        schedule=payload.schedule,
        privacy_level=payload.privacy_level,
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


@router.patch("/{habit_id}", response_model=HabitOut)
def update_habit(
    habit_id: uuid.UUID,
    payload: HabitUpdate,
    db: Session = Depends(get_db),
) -> Habit:
    habit = db.get(Habit, habit_id)
    if habit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "habit not found")
    data = payload.model_dump(exclude_unset=True)
    if "kind" in data and data["kind"] not in HABIT_KINDS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid kind")
    for field, value in data.items():
        setattr(habit, field, value)
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


@router.delete("/{habit_id}")
def delete_habit(habit_id: uuid.UUID, db: Session = Depends(get_db)) -> Response:
    habit = db.get(Habit, habit_id)
    if habit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "habit not found")
    db.delete(habit)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ----------------------------------------------------------------------
# Endpoints — logs
# ----------------------------------------------------------------------
@router.post(
    "/{habit_id}/checkin",
    response_model=HabitLogOut,
    status_code=status.HTTP_201_CREATED,
)
def check_in(
    habit_id: uuid.UUID,
    payload: HabitCheckIn,
    db: Session = Depends(get_db),
) -> HabitLog:
    habit = db.get(Habit, habit_id)
    if habit is None or habit.user_id != payload.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "habit not found")

    log_date = payload.log_date or date.today()

    # Upsert on (habit_id, log_date) so re-checking just updates today.
    stmt = (
        pg_insert(HabitLog)
        .values(
            habit_id=habit_id,
            user_id=payload.user_id,
            log_date=log_date,
            value_bool=payload.value_bool,
            value_number=payload.value_number,
            value_text=payload.value_text,
            notes=payload.notes,
        )
        .on_conflict_do_update(
            constraint="uq_habit_log_per_day",
            set_={
                "value_bool": payload.value_bool,
                "value_number": payload.value_number,
                "value_text": payload.value_text,
                "notes": payload.notes,
            },
        )
        .returning(HabitLog.id)
    )
    log_id = db.execute(stmt).scalar_one()
    db.commit()
    log = db.get(HabitLog, log_id)
    assert log is not None  # just inserted/updated
    return log


@router.get("/{habit_id}/logs", response_model=list[HabitLogOut])
def list_logs(
    habit_id: uuid.UUID,
    user_id: uuid.UUID = Query(...),
    since: date | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[HabitLog]:
    habit = db.get(Habit, habit_id)
    if habit is None or habit.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "habit not found")
    stmt = (
        select(HabitLog)
        .where(HabitLog.habit_id == habit_id)
        .order_by(HabitLog.log_date.desc())
    )
    if since is not None:
        stmt = stmt.where(HabitLog.log_date >= since)
    return list(db.execute(stmt).scalars())


# Convenience: today's logs for all of a user's active habits in one call.
class HabitWithToday(BaseModel):
    habit: HabitOut
    today: HabitLogOut | None


@router.get("/today", response_model=list[HabitWithToday])
def habits_today(
    user_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
) -> list[HabitWithToday]:
    today = date.today()
    habits = list(
        db.execute(
            select(Habit)
            .where(Habit.user_id == user_id)
            .where(Habit.active.is_(True))
            .order_by(Habit.created_at.asc())
        ).scalars()
    )
    if not habits:
        return []
    habit_ids = [h.id for h in habits]
    log_rows = list(
        db.execute(
            select(HabitLog)
            .where(HabitLog.habit_id.in_(habit_ids))
            .where(HabitLog.log_date == today)
        ).scalars()
    )
    by_habit: dict[uuid.UUID, HabitLog] = {row.habit_id: row for row in log_rows}
    return [
        HabitWithToday(
            habit=HabitOut.model_validate(h),
            today=(
                HabitLogOut.model_validate(by_habit[h.id])
                if h.id in by_habit
                else None
            ),
        )
        for h in habits
    ]
