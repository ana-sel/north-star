"""Tests for Diary API CRUD.

Uses real DB (test session).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
USER_ID = "00000000-0000-0000-0000-000000000000"


def test_create_diary_entry():
    resp = client.post("/diary", json={
        "user_id": USER_ID,
        "title": "Morning reflection",
        "body": "Felt calm today. Good sleep.",
        "mood": "😊",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["body"] == "Felt calm today. Good sleep."
    assert data["mood"] == "😊"
    assert data["privacy_level"] == "sensitive"
    return data["id"]


def test_list_diary_entries():
    # Create one first
    client.post("/diary", json={
        "user_id": USER_ID,
        "body": "Quick note.",
    })
    resp = client.get(f"/diary?user_id={USER_ID}")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) >= 1
    # Newest first
    dates = [e["created_at"] for e in entries]
    assert dates == sorted(dates, reverse=True)


def test_get_diary_entry():
    create = client.post("/diary", json={
        "user_id": USER_ID,
        "body": "Detail test",
    })
    entry_id = create.json()["id"]
    resp = client.get(f"/diary/{entry_id}")
    assert resp.status_code == 200
    assert resp.json()["body"] == "Detail test"


def test_update_diary_entry():
    create = client.post("/diary", json={
        "user_id": USER_ID,
        "body": "Original body",
    })
    entry_id = create.json()["id"]
    resp = client.patch(f"/diary/{entry_id}", json={
        "body": "Updated body",
        "mood": "😤",
    })
    assert resp.status_code == 200
    assert resp.json()["body"] == "Updated body"
    assert resp.json()["mood"] == "😤"


def test_delete_diary_entry():
    create = client.post("/diary", json={
        "user_id": USER_ID,
        "body": "To be deleted",
    })
    entry_id = create.json()["id"]
    resp = client.delete(f"/diary/{entry_id}")
    assert resp.status_code == 204
    # Verify gone
    resp2 = client.get(f"/diary/{entry_id}")
    assert resp2.status_code == 404


def test_get_nonexistent_returns_404():
    fake_id = str(uuid.uuid4())
    resp = client.get(f"/diary/{fake_id}")
    assert resp.status_code == 404


def test_create_requires_body():
    resp = client.post("/diary", json={
        "user_id": USER_ID,
    })
    assert resp.status_code == 422
