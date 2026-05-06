"""Tests for the Health Agent (spec section 8 later agents)."""
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
        db.add(User(id=user_id, email=f"hagent-{user_id}@test.local"))
        db.commit()
    yield user_id
    with SessionLocal() as db:
        db.query(HealthLog).filter(HealthLog.user_id == user_id).delete()
        db.query(User).filter(User.id == user_id).delete()
        db.commit()


def test_no_logs_short_circuits(dev_user):
    resp = client.post(
        "/agents/health", json={"user_id": str(dev_user), "days": 14}
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["used_ai"] is False
    assert body["stats"]["sample_count"] == 0
    assert body["summary"].startswith("No health logs")
    assert body["patterns"] == []


def test_under_three_logs_short_circuits(dev_user):
    today = date.today()
    with SessionLocal() as db:
        db.add(HealthLog(user_id=dev_user, log_date=today, sleep_minutes=420))
        db.add(
            HealthLog(
                user_id=dev_user,
                log_date=today - timedelta(days=1),
                sleep_minutes=480,
            )
        )
        db.commit()

    resp = client.post(
        "/agents/health", json={"user_id": str(dev_user), "days": 14}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["used_ai"] is False
    assert body["stats"]["sample_count"] == 2
    assert body["stats"]["sleep_minutes"]["count"] == 2
    assert body["stats"]["sleep_minutes"]["avg"] == 450.0


def test_window_filters_old_logs(dev_user):
    today = date.today()
    with SessionLocal() as db:
        db.add(HealthLog(user_id=dev_user, log_date=today, mood=8))
        db.add(
            HealthLog(
                user_id=dev_user, log_date=today - timedelta(days=2), mood=6
            )
        )
        db.add(
            HealthLog(
                user_id=dev_user,
                log_date=today - timedelta(days=30),
                mood=3,
            )
        )
        db.commit()

    resp = client.post(
        "/agents/health", json={"user_id": str(dev_user), "days": 7}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["stats"]["sample_count"] == 2
    assert body["stats"]["mood"]["count"] == 2
    # avg of 8 and 6
    assert body["stats"]["mood"]["avg"] == 7.0


def test_field_stat_handles_partial_fields(dev_user):
    """sleep set on day1, steps set on day2 - both fields counted independently."""
    today = date.today()
    with SessionLocal() as db:
        db.add(
            HealthLog(
                user_id=dev_user, log_date=today, sleep_minutes=480
            )
        )
        db.add(
            HealthLog(
                user_id=dev_user,
                log_date=today - timedelta(days=1),
                steps=8000,
            )
        )
        db.add(
            HealthLog(
                user_id=dev_user,
                log_date=today - timedelta(days=2),
                sleep_minutes=400,
                steps=10000,
            )
        )
        db.commit()

    resp = client.post(
        "/agents/health", json={"user_id": str(dev_user), "days": 14}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["stats"]["sleep_minutes"]["count"] == 2
    assert body["stats"]["steps"]["count"] == 2
    assert body["stats"]["weight_kg"]["count"] == 0
