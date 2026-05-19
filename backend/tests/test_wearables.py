"""Tests for the wearables bulk-import endpoint (/wearables/import)."""
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
def wearable_user():
    user_id = uuid.uuid4()
    with SessionLocal() as db:
        db.add(User(id=user_id, email=f"wear-{user_id}@test.local"))
        db.commit()
    yield user_id
    with SessionLocal() as db:
        db.query(HealthLog).filter(HealthLog.user_id == user_id).delete()
        db.query(User).filter(User.id == user_id).delete()
        db.commit()


def test_import_creates_rows(wearable_user):
    today = date.today()
    payload = {
        "user_id": str(wearable_user),
        "source": "apple_health",
        "days": [
            {
                "log_date": today.isoformat(),
                "sleep_minutes": 420,
                "steps": 8200,
                "weight_kg": 70.5,
            },
            {
                "log_date": (today - timedelta(days=1)).isoformat(),
                "sleep_minutes": 380,
                "steps": 6100,
            },
        ],
    }
    resp = client.post("/wearables/import", json=payload)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body == {"source": "apple_health", "created": 2, "updated": 0}

    with SessionLocal() as db:
        rows = (
            db.query(HealthLog)
            .filter(HealthLog.user_id == wearable_user)
            .order_by(HealthLog.log_date)
            .all()
        )
        assert len(rows) == 2
        assert rows[1].steps == 8200
        assert float(rows[1].weight_kg) == 70.5


def test_import_upserts_only_provided_fields(wearable_user):
    today = date.today()

    # First import: full row.
    r1 = client.post(
        "/wearables/import",
        json={
            "user_id": str(wearable_user),
            "source": "apple_health",
            "days": [
                {
                    "log_date": today.isoformat(),
                    "sleep_minutes": 420,
                    "steps": 8200,
                    "weight_kg": 70.5,
                }
            ],
        },
    )
    assert r1.status_code == 200

    # Second import: only steps. Other fields must be preserved.
    r2 = client.post(
        "/wearables/import",
        json={
            "user_id": str(wearable_user),
            "source": "fitbit",
            "days": [
                {"log_date": today.isoformat(), "steps": 9999},
            ],
        },
    )
    assert r2.status_code == 200
    assert r2.json() == {"source": "fitbit", "created": 0, "updated": 1}

    with SessionLocal() as db:
        row = (
            db.query(HealthLog)
            .filter(
                HealthLog.user_id == wearable_user,
                HealthLog.log_date == today,
            )
            .one()
        )
        assert row.steps == 9999
        assert row.sleep_minutes == 420  # preserved
        assert float(row.weight_kg) == 70.5  # preserved


def test_import_rejects_empty_days(wearable_user):
    resp = client.post(
        "/wearables/import",
        json={"user_id": str(wearable_user), "source": "fitbit", "days": []},
    )
    assert resp.status_code == 400


def test_import_rejects_out_of_range_values(wearable_user):
    resp = client.post(
        "/wearables/import",
        json={
            "user_id": str(wearable_user),
            "source": "fitbit",
            "days": [{"log_date": date.today().isoformat(), "steps": 999_999}],
        },
    )
    assert resp.status_code == 422
