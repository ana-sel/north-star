"""Tests for the Money Agent (spec section 8 later agents)."""
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
        db.add(User(id=user_id, email=f"magent-{user_id}@test.local"))
        db.commit()
    yield user_id
    with SessionLocal() as db:
        db.query(MoneyTransaction).filter(
            MoneyTransaction.user_id == user_id
        ).delete()
        db.query(User).filter(User.id == user_id).delete()
        db.commit()


def test_no_txns_short_circuits(dev_user):
    resp = client.post(
        "/agents/money", json={"user_id": str(dev_user), "days": 30}
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["used_ai"] is False
    assert body["stats"]["txn_count"] == 0
    assert body["summary"].startswith("No transactions")


def test_under_three_txns_short_circuits(dev_user):
    today = date.today()
    with SessionLocal() as db:
        db.add(
            MoneyTransaction(
                user_id=dev_user,
                txn_date=today,
                amount=Decimal("-12.50"),
                category="food",
            )
        )
        db.add(
            MoneyTransaction(
                user_id=dev_user,
                txn_date=today,
                amount=Decimal("2000.00"),
                category="salary",
            )
        )
        db.commit()

    resp = client.post(
        "/agents/money", json={"user_id": str(dev_user), "days": 30}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["used_ai"] is False
    assert body["stats"]["txn_count"] == 2
    assert body["stats"]["income"] == 2000.0
    assert body["stats"]["expenses"] == -12.5
    assert body["stats"]["net"] == 1987.5


def test_top_categories_ranked_by_most_spent(dev_user):
    today = date.today()
    with SessionLocal() as db:
        # food: -50 over 2 txns
        db.add(
            MoneyTransaction(
                user_id=dev_user, txn_date=today, amount=Decimal("-30"), category="food"
            )
        )
        db.add(
            MoneyTransaction(
                user_id=dev_user, txn_date=today, amount=Decimal("-20"), category="food"
            )
        )
        # rent: -800 (most negative -> first)
        db.add(
            MoneyTransaction(
                user_id=dev_user, txn_date=today, amount=Decimal("-800"), category="rent"
            )
        )
        # transport: -10
        db.add(
            MoneyTransaction(
                user_id=dev_user,
                txn_date=today,
                amount=Decimal("-10"),
                category="transport",
            )
        )
        db.commit()

    resp = client.post(
        "/agents/money", json={"user_id": str(dev_user), "days": 30}
    )
    assert resp.status_code == 200
    body = resp.json()
    cats = body["stats"]["top_categories"]
    assert len(cats) == 3
    # Most negative (rent) first.
    assert cats[0]["category"] == "rent"
    assert cats[0]["total"] == -800.0
    assert cats[1]["category"] == "food"
    assert cats[1]["total"] == -50.0
    assert cats[1]["count"] == 2


def test_window_filters_old_txns(dev_user):
    today = date.today()
    with SessionLocal() as db:
        db.add(
            MoneyTransaction(
                user_id=dev_user, txn_date=today, amount=Decimal("-10")
            )
        )
        db.add(
            MoneyTransaction(
                user_id=dev_user,
                txn_date=today - timedelta(days=2),
                amount=Decimal("-20"),
            )
        )
        # Outside 7-day window:
        db.add(
            MoneyTransaction(
                user_id=dev_user,
                txn_date=today - timedelta(days=60),
                amount=Decimal("-999"),
            )
        )
        db.commit()

    resp = client.post(
        "/agents/money", json={"user_id": str(dev_user), "days": 7}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["stats"]["txn_count"] == 2
    assert body["stats"]["expenses"] == -30.0
