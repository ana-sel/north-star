"""Tests for the Health log API."""
from __future__ import annotations

import uuid
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.db import SessionLocal
from app.main import app
from app.models.health_log import HealthLog
from app.models.user import User


client = TestClient(app)


@pytest.fixture
def dev_user():
    user_id = uuid.uuid4()
    with SessionLocal() as db:
        db.add(User(id=user_id, email=f"health-{user_id}@test.local"))
        db.commit()
    yield user_id
    with SessionLocal() as db:
        db.query(HealthLog).filter(HealthLog.user_id == user_id).delete()
        db.query(User).filter(User.id == user_id).delete()
        db.commit()


def test_upsert_creates_one_row_per_day(dev_user):
    user_id = str(dev_user)
    today = str(date.today())

    # First save: sleep + mood
    resp = client.post(
        "/health",
        json={
            "user_id": user_id,
            "log_date": today,
            "sleep_minutes": 420,
            "mood": 7,
        },
    )
    assert resp.status_code == 201, resp.text
    row1 = resp.json()
    assert row1["sleep_minutes"] == 420
    assert row1["mood"] == 7
    assert row1["weight_kg"] is None

    # Second save: weight only — should NOT wipe sleep/mood
    resp = client.post(
        "/health",
        json={"user_id": user_id, "log_date": today, "weight_kg": 72.5},
    )
    assert resp.status_code == 201, resp.text
    row2 = resp.json()
    assert row2["id"] == row1["id"]  # same row
    assert row2["weight_kg"] == 72.5
    assert row2["sleep_minutes"] == 420
    assert row2["mood"] == 7


def test_today_endpoint_returns_null_when_empty(dev_user):
    resp = client.get("/health/today", params={"user_id": str(dev_user)})
    assert resp.status_code == 200
    assert resp.json() is None


def test_today_endpoint_returns_today_row(dev_user):
    user_id = str(dev_user)
    client.post(
        "/health",
        json={"user_id": user_id, "calories": 1800},
    )
    resp = client.get("/health/today", params={"user_id": user_id})
    assert resp.status_code == 200
    assert resp.json()["calories"] == 1800


def test_list_returns_recent_window(dev_user):
    user_id = str(dev_user)
    today = date.today()
    for offset in [0, 1, 5]:
        client.post(
            "/health",
            json={
                "user_id": user_id,
                "log_date": str(today - timedelta(days=offset)),
                "calories": 1500 + offset,
            },
        )
    resp = client.get("/health", params={"user_id": user_id, "days": 30})
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) == 3
    # Newest first
    assert rows[0]["log_date"] == str(today)
