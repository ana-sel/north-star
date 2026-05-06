"""Integration test for the cards list endpoint's card_type filter."""
from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from app.db import SessionLocal
from app.main import app
from app.models.card import Card
from app.models.user import User


client = TestClient(app)


@pytest.fixture
def dev_user():
    user_id = uuid.uuid4()
    with SessionLocal() as db:
        db.add(User(id=user_id, email=f"diary-{user_id}@test.local"))
        db.commit()
    yield user_id
    with SessionLocal() as db:
        db.query(Card).filter(Card.user_id == user_id).delete()
        db.query(User).filter(User.id == user_id).delete()
        db.commit()


def test_card_type_filter_returns_only_matching_cards(dev_user):
    user_id = str(dev_user)

    for title, ctype in [
        ("Pay rent", "task"),
        ("Felt grateful today", "diary"),
        ("Tense morning", "diary"),
        ("Buy groceries", "task"),
    ]:
        resp = client.post(
            "/cards",
            json={"user_id": user_id, "title": title, "type": ctype},
        )
        assert resp.status_code == 201, resp.text

    resp = client.get(
        "/cards", params={"user_id": user_id, "card_type": "diary"}
    )
    assert resp.status_code == 200, resp.text
    rows = resp.json()
    assert len(rows) == 2
    assert all(r["type"] == "diary" for r in rows)
    assert {r["title"] for r in rows} == {
        "Felt grateful today",
        "Tense morning",
    }


def test_card_type_filter_with_no_matches_returns_empty(dev_user):
    user_id = str(dev_user)
    client.post(
        "/cards", json={"user_id": user_id, "title": "Only task", "type": "task"}
    )

    resp = client.get(
        "/cards", params={"user_id": user_id, "card_type": "diary"}
    )
    assert resp.status_code == 200
    assert resp.json() == []


def test_unfiltered_list_still_returns_all_types(dev_user):
    user_id = str(dev_user)
    for title, ctype in [("A", "task"), ("B", "diary")]:
        client.post(
            "/cards",
            json={"user_id": user_id, "title": title, "type": ctype},
        )

    resp = client.get("/cards", params={"user_id": user_id})
    assert resp.status_code == 200
    assert len(resp.json()) == 2
