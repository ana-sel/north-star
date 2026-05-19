"""Tests for /calendar/settings and /calendar/ics-stored."""
from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from app.auth import create_access_token, hash_password
from app.db import SessionLocal
from app.main import app
from app.models.user import User
from app.utils.crypto import decrypt_str


client = TestClient(app)


@pytest.fixture
def auth_user():
    user_id = uuid.uuid4()
    with SessionLocal() as db:
        db.add(
            User(
                id=user_id,
                email=f"cal-{user_id}@test.local",
                hashed_password=hash_password("pw12345678"),
            )
        )
        db.commit()
    token = create_access_token(user_id)
    yield user_id, {"Authorization": f"Bearer {token}"}
    with SessionLocal() as db:
        db.query(User).filter(User.id == user_id).delete()
        db.commit()


def test_settings_default_empty(auth_user):
    _uid, headers = auth_user
    r = client.get("/calendar/settings", headers=headers)
    assert r.status_code == 200
    assert r.json() == {"ics_url_set": False}


def test_put_settings_stores_encrypted_url(auth_user, monkeypatch):
    user_id, headers = auth_user
    # Force-enable encryption for this test so we can assert that the stored
    # token is NOT the plaintext URL. (Default settings have an empty key →
    # passthrough; that's the dev-mode contract verified separately.)
    from cryptography.fernet import Fernet

    monkeypatch.setattr(
        "app.config.settings.files_encryption_key", Fernet.generate_key().decode()
    )
    url = "https://example.com/calendar/private/abc.ics"

    r = client.put("/calendar/settings", json={"ics_url": url}, headers=headers)
    assert r.status_code == 200
    assert r.json() == {"ics_url_set": True}

    # The DB should hold a Fernet token, not the plaintext URL.
    with SessionLocal() as db:
        user = db.query(User).filter(User.id == user_id).first()
        token = user.user_settings["ics_url_encrypted"]
    assert token != url
    assert decrypt_str(token) == url


def test_put_settings_clears_when_null(auth_user):
    _uid, headers = auth_user
    url = "https://example.com/calendar/private/zzz.ics"

    client.put("/calendar/settings", json={"ics_url": url}, headers=headers)
    r = client.put("/calendar/settings", json={"ics_url": None}, headers=headers)
    assert r.status_code == 200
    assert r.json() == {"ics_url_set": False}

    r2 = client.get("/calendar/settings", headers=headers)
    assert r2.json() == {"ics_url_set": False}


def test_ics_stored_404_when_unset(auth_user):
    _uid, headers = auth_user
    r = client.get("/calendar/ics-stored", headers=headers)
    assert r.status_code == 404


def test_settings_requires_auth():
    r = client.get("/calendar/settings")
    assert r.status_code == 401
