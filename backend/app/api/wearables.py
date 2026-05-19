"""Wearables API — spec §13 nice-to-have.

Bulk import endpoint for data exported from Apple Health / Fitbit /
Garmin / Oura. The user exports a JSON file (or scripts the export with
e.g. Auto Export for Apple Health) and POSTs it here. We upsert into
`health_logs` by (user_id, log_date).

No OAuth, no continuous sync — manual push only. This is the
local-first, low-trust shape; future work can add per-provider OAuth
sync agents behind their own AgentPolicy.
"""
from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.health_log import HealthLog


router = APIRouter(prefix="/wearables", tags=["wearables"])


class WearableDay(BaseModel):
    log_date: date
    sleep_minutes: int | None = Field(default=None, ge=0, le=24 * 60)
    steps: int | None = Field(default=None, ge=0, le=200_000)
    weight_kg: float | None = Field(default=None, gt=0, lt=500)
    calories: int | None = Field(default=None, ge=0, le=20_000)
    bedtime: str | None = Field(default=None, max_length=5)  # "HH:MM"
    wake_time: str | None = Field(default=None, max_length=5)


class WearableImport(BaseModel):
    user_id: uuid.UUID
    source: str = Field(..., max_length=64)  # e.g. "apple_health", "fitbit"
    days: list[WearableDay]


class WearableImportResult(BaseModel):
    source: str
    created: int
    updated: int


@router.post("/import", response_model=WearableImportResult, status_code=status.HTTP_200_OK)
def import_wearable_data(
    payload: WearableImport,
    db: Session = Depends(get_db),
) -> WearableImportResult:
    """Upsert wearable health metrics into health_logs.

    Only non-null fields on each `WearableDay` overwrite the existing row.
    Existing fields not present in the payload are preserved.
    """
    if not payload.days:
        raise HTTPException(status_code=400, detail="No days provided")

    dates = [d.log_date for d in payload.days]
    existing_rows = list(
        db.execute(
            select(HealthLog).where(
                HealthLog.user_id == payload.user_id,
                HealthLog.log_date.in_(dates),
            )
        ).scalars()
    )
    by_date = {row.log_date: row for row in existing_rows}

    created = 0
    updated = 0
    for day in payload.days:
        row = by_date.get(day.log_date)
        fields = day.model_dump(exclude={"log_date"}, exclude_none=True)
        if row is None:
            row = HealthLog(
                user_id=payload.user_id,
                log_date=day.log_date,
                **fields,
            )
            db.add(row)
            created += 1
        else:
            for k, v in fields.items():
                setattr(row, k, v)
            updated += 1

    db.commit()
    return WearableImportResult(
        source=payload.source, created=created, updated=updated
    )
