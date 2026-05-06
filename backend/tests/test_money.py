"""Tests for the Money API."""
from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.db import SessionLocal
from app.main import app
from app.models.money_transaction import MoneyTransaction
from app.models.user import User


client = TestClient(app)


@pytest.fixture
def dev_user():
    user_id = uuid.uuid4()
    with SessionLocal() as db:
        db.add(User(id=user_id, email=f"money-{user_id}@test.local"))
        db.commit()
    yield user_id
    with SessionLocal() as db:
        db.query(MoneyTransaction).filter(MoneyTransaction.user_id == user_id).delete()
        db.query(User).filter(User.id == user_id).delete()
        db.commit()


def _add(user_id: str, amount: str, category: str | None = None, day_offset: int = 0):
    return client.post(
        "/money",
        json={
            "user_id": user_id,
            "amount": amount,
            "category": category,
            "txn_date": str(date.today() - timedelta(days=day_offset)),
        },
    )


def test_create_list_update_delete(dev_user):
    user_id = str(dev_user)

    resp = _add(user_id, "-12.50", "groceries")
    assert resp.status_code == 201, resp.text
    txn = resp.json()
    assert Decimal(txn["amount"]) == Decimal("-12.50")
    assert txn["category"] == "groceries"

    _add(user_id, "1500.00", "salary")
    _add(user_id, "-40.00", "transport")

    resp = client.get("/money", params={"user_id": user_id})
    assert resp.status_code == 200
    assert len(resp.json()) == 3

    # Filter by category
    resp = client.get(
        "/money", params={"user_id": user_id, "category": "groceries"}
    )
    assert len(resp.json()) == 1

    # Update
    resp = client.patch(
        f"/money/{txn['id']}", json={"amount": "-15.00"}
    )
    assert resp.status_code == 200
    assert Decimal(resp.json()["amount"]) == Decimal("-15.00")

    # Delete
    resp = client.delete(f"/money/{txn['id']}")
    assert resp.status_code == 204
    resp = client.get("/money", params={"user_id": user_id})
    assert len(resp.json()) == 2


def test_summary_aggregates_income_expenses_and_categories(dev_user):
    user_id = str(dev_user)
    _add(user_id, "2000.00", "salary")
    _add(user_id, "-30.00", "groceries")
    _add(user_id, "-50.00", "groceries")
    _add(user_id, "-20.00", None)  # uncategorised

    resp = client.get("/money/summary", params={"user_id": user_id, "days": 30})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert Decimal(body["income"]) == Decimal("2000.00")
    assert Decimal(body["expenses"]) == Decimal("-100.00")
    assert Decimal(body["net"]) == Decimal("1900.00")

    cats = {c["category"]: c for c in body["by_category"]}
    assert Decimal(cats["groceries"]["total"]) == Decimal("-80.00")
    assert cats["groceries"]["count"] == 2
    assert "uncategorised" in cats
    assert Decimal(cats["salary"]["total"]) == Decimal("2000.00")


def test_window_excludes_old_transactions(dev_user):
    user_id = str(dev_user)
    _add(user_id, "-10.00", "old", day_offset=60)
    _add(user_id, "-5.00", "new", day_offset=0)

    resp = client.get("/money", params={"user_id": user_id, "days": 30})
    rows = resp.json()
    assert len(rows) == 1
    assert rows[0]["category"] == "new"


def test_404_on_missing(dev_user):
    fake = str(uuid.uuid4())
    assert client.patch(f"/money/{fake}", json={"amount": "1"}).status_code == 404
    assert client.delete(f"/money/{fake}").status_code == 404
