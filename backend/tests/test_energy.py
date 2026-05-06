"""Tests for the Energy log API."""
from __future__ import annotations

import uuid

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
        db.add(User(id=user_id, email=f"energy-{user_id}@test.local"))
        db.commit()
    yield user_id
    with SessionLocal() as db:
        db.query(EnergyLog).filter(EnergyLog.user_id == user_id).delete()
        db.query(User).filter(User.id == user_id).delete()
        db.commit()


def test_log_and_list_energy(dev_user):
    user_id = str(dev_user)

    for level in ["low", "medium", "high"]:
        resp = client.post(
            "/energy", json={"user_id": user_id, "level": level}
        )
        assert resp.status_code == 201, resp.text
        assert resp.json()["level"] == level

    resp = client.get("/energy", params={"user_id": user_id})
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) == 3
    # Newest first
    assert [r["level"] for r in rows] == ["high", "medium", "low"]


def test_latest_energy_returns_most_recent(dev_user):
    user_id = str(dev_user)
    resp = client.get("/energy/latest", params={"user_id": user_id})
    assert resp.status_code == 200
    assert resp.json() is None

    client.post("/energy", json={"user_id": user_id, "level": "low"})
    client.post(
        "/energy",
        json={"user_id": user_id, "level": "high", "notes": "Coffee kicked in"},
    )

    resp = client.get("/energy/latest", params={"user_id": user_id})
    assert resp.status_code == 200
    body = resp.json()
    assert body["level"] == "high"
    assert body["notes"] == "Coffee kicked in"


def test_invalid_level_rejected(dev_user):
    resp = client.post(
        "/energy", json={"user_id": str(dev_user), "level": "extreme"}
    )
    assert resp.status_code == 422
