"""Tests for JWT auth — register, login, token verification."""

import pytest
from fastapi.testclient import TestClient

from app.auth import create_access_token, hash_password, verify_password, get_current_user
from app.main import app

client = TestClient(app)


# ── Password hashing ────────────────────────────────────────────────
def test_hash_and_verify_password():
    hashed = hash_password("secret123")
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong", hashed)


# ── Token creation ──────────────────────────────────────────────────
def test_create_access_token():
    import uuid
    from jose import jwt
    from app.config import settings

    uid = uuid.uuid4()
    token = create_access_token(uid)
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    assert payload["sub"] == str(uid)
    assert "exp" in payload


# ── Register endpoint ───────────────────────────────────────────────
def test_register_success():
    import uuid
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    r = client.post("/auth/register", json={"email": email, "password": "pass1234"})
    assert r.status_code == 201
    data = r.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_register_duplicate():
    import uuid
    email = f"dup-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={"email": email, "password": "pass1234"})
    r = client.post("/auth/register", json={"email": email, "password": "pass1234"})
    assert r.status_code == 409


# ── Login endpoint ──────────────────────────────────────────────────
def test_login_success():
    import uuid
    email = f"login-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={"email": email, "password": "pass1234"})
    r = client.post("/auth/login", json={"email": email, "password": "pass1234"})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_wrong_password():
    import uuid
    email = f"wrongpw-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={"email": email, "password": "pass1234"})
    r = client.post("/auth/login", json={"email": email, "password": "wrongwrong"})
    assert r.status_code == 401


def test_login_nonexistent():
    r = client.post("/auth/login", json={"email": "nobody@example.com", "password": "x"})
    assert r.status_code == 401
