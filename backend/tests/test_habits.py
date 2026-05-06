"""Integration tests for the Habits API.

Hits the real test Postgres (Phase-5+ tests already assume it's up).
Each test cleans up the rows it creates so re-runs stay idempotent.
"""
from __future__ import annotations

import uuid
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.db import SessionLocal
from app.main import app
from app.models.habit import Habit, HabitLog
from app.models.user import User


client = TestClient(app)


@pytest.fixture
def dev_user():
    """Ensure a fresh user exists for the test, clean up afterwards."""
    user_id = uuid.uuid4()
    with SessionLocal() as db:
        db.add(User(id=user_id, email=f"habit-{user_id}@test.local"))
        db.commit()
    yield user_id
    with SessionLocal() as db:
        # Cascade: habit_logs → habits → user.
        db.query(HabitLog).filter(HabitLog.user_id == user_id).delete()
        db.query(Habit).filter(Habit.user_id == user_id).delete()
        db.query(User).filter(User.id == user_id).delete()
        db.commit()


def test_create_list_update_delete_habit(dev_user):
    user_id = str(dev_user)

    # Create
    resp = client.post(
        "/habits",
        json={"user_id": user_id, "title": "Drink water", "kind": "yes_no"},
    )
    assert resp.status_code == 201, resp.text
    habit = resp.json()
    assert habit["title"] == "Drink water"
    assert habit["active"] is True
    habit_id = habit["id"]

    # List
    resp = client.get("/habits", params={"user_id": user_id})
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    # Update — set inactive
    resp = client.patch(f"/habits/{habit_id}", json={"active": False})
    assert resp.status_code == 200
    assert resp.json()["active"] is False

    # Active filter excludes it now
    resp = client.get("/habits", params={"user_id": user_id})
    assert resp.json() == []
    resp = client.get(
        "/habits", params={"user_id": user_id, "include_inactive": True}
    )
    assert len(resp.json()) == 1

    # Delete
    resp = client.delete(f"/habits/{habit_id}")
    assert resp.status_code == 204


def test_check_in_upserts_per_day(dev_user):
    user_id = str(dev_user)

    habit = client.post(
        "/habits",
        json={"user_id": user_id, "title": "Walk 10 min", "kind": "yes_no"},
    ).json()
    hid = habit["id"]

    # First check-in
    resp = client.post(
        f"/habits/{hid}/checkin",
        json={"user_id": user_id, "value_bool": True},
    )
    assert resp.status_code == 201, resp.text
    log_a = resp.json()
    assert log_a["value_bool"] is True

    # Second check-in same day → upsert (same id, updated value)
    resp = client.post(
        f"/habits/{hid}/checkin",
        json={"user_id": user_id, "value_bool": False, "notes": "skipped"},
    )
    assert resp.status_code == 201
    log_b = resp.json()
    assert log_b["id"] == log_a["id"]
    assert log_b["value_bool"] is False
    assert log_b["notes"] == "skipped"


def test_logs_are_returned_in_descending_date_order(dev_user):
    user_id = str(dev_user)

    habit = client.post(
        "/habits",
        json={"user_id": user_id, "title": "Read", "kind": "number"},
    ).json()
    hid = habit["id"]

    today = date.today()
    for delta, value in [(2, 10), (1, 20), (0, 30)]:
        resp = client.post(
            f"/habits/{hid}/checkin",
            json={
                "user_id": user_id,
                "log_date": str(today - timedelta(days=delta)),
                "value_number": value,
            },
        )
        assert resp.status_code == 201

    resp = client.get(f"/habits/{hid}/logs", params={"user_id": user_id})
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) == 3
    dates = [r["log_date"] for r in rows]
    assert dates == sorted(dates, reverse=True)


def test_habits_today_endpoint_pairs_logs(dev_user):
    user_id = str(dev_user)

    h1 = client.post(
        "/habits", json={"user_id": user_id, "title": "Sleep on time"}
    ).json()
    h2 = client.post(
        "/habits", json={"user_id": user_id, "title": "Protein"}
    ).json()

    # Only check-in habit 1 today
    client.post(
        f"/habits/{h1['id']}/checkin",
        json={"user_id": user_id, "value_bool": True},
    )

    resp = client.get("/habits/today", params={"user_id": user_id})
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) == 2

    by_id = {r["habit"]["id"]: r for r in rows}
    assert by_id[h1["id"]]["today"] is not None
    assert by_id[h1["id"]]["today"]["value_bool"] is True
    assert by_id[h2["id"]]["today"] is None


def test_invalid_kind_rejected(dev_user):
    user_id = str(dev_user)
    resp = client.post(
        "/habits",
        json={"user_id": user_id, "title": "Bad", "kind": "telepathy"},
    )
    # Pydantic rejects with 422 (Literal mismatch).
    assert resp.status_code == 422


def test_check_in_for_other_users_habit_404(dev_user):
    user_id = str(dev_user)
    habit = client.post(
        "/habits", json={"user_id": user_id, "title": "Mine"}
    ).json()
    other_user = str(uuid.uuid4())
    resp = client.post(
        f"/habits/{habit['id']}/checkin",
        json={"user_id": other_user, "value_bool": True},
    )
    assert resp.status_code == 404
