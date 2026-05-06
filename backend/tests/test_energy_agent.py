"""Tests for the Energy Agent (spec §8 later agents)."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.db import SessionLocal
from app.main import app
from app.models.energy import EnergyLog
from app.models.user import User


client = TestClient(app)


@pytest.fixture
def dev_user():
    user_id = uuid.uuid4()
    with SessionLocal() as db:
        db.add(User(id=user_id, email=f"eagent-{user_id}@test.local"))
        db.commit()
    yield user_id
    with SessionLocal() as db:
        db.query(EnergyLog).filter(EnergyLog.user_id == user_id).delete()
        db.query(User).filter(User.id == user_id).delete()
        db.commit()


def test_no_logs_short_circuits_without_ai(dev_user):
    resp = client.post(
        "/agents/energy",
        json={"user_id": str(dev_user), "days": 14},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["used_ai"] is False
    assert body["stats"]["sample_count"] == 0
    assert body["summary"].startswith("No energy logs")
    assert body["patterns"] == []
    assert any("log your energy" in s.lower() for s in body["suggestions"])


def test_under_three_logs_short_circuits(dev_user):
    user_id = str(dev_user)
    # 2 logs is below the threshold (3)
    for level in ["medium", "high"]:
        client.post("/energy", json={"user_id": user_id, "level": level})

    resp = client.post(
        "/agents/energy", json={"user_id": user_id, "days": 14}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["used_ai"] is False
    assert body["stats"]["sample_count"] == 2
    assert body["stats"]["by_level"]["medium"] == 1
    assert body["stats"]["by_level"]["high"] == 1
    # avg_score = (2 + 3) / 2 = 2.5
    assert body["stats"]["avg_score"] == 2.5


def test_stats_count_logs_in_window(dev_user):
    """Older logs (outside window) must be excluded from stats."""
    user_id = dev_user
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        # Inside 7-day window
        db.add(EnergyLog(user_id=user_id, level="high", logged_at=now))
        db.add(
            EnergyLog(
                user_id=user_id, level="low", logged_at=now - timedelta(days=2)
            )
        )
        # Outside window
        db.add(
            EnergyLog(
                user_id=user_id,
                level="medium",
                logged_at=now - timedelta(days=30),
            )
        )
        db.commit()

    resp = client.post(
        "/agents/energy", json={"user_id": str(user_id), "days": 7}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["stats"]["sample_count"] == 2
    assert body["stats"]["by_level"]["medium"] == 0
