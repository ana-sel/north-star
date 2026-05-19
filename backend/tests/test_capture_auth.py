"""Tests for Chat redesign slice 0: /agents/capture is JWT-scoped.

Acceptance:
- No Authorization header -> 401.
- Bad/expired token -> 401.
- Valid token: the request is processed against the authenticated
  user, even if a different user_id is passed in the body.
"""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.auth import create_access_token, hash_password
from app.db import SessionLocal
from app.main import app
from app.models.user import User


client = TestClient(app)


def _make_user() -> tuple[uuid.UUID, dict[str, str]]:
    user_id = uuid.uuid4()
    with SessionLocal() as db:
        db.add(
            User(
                id=user_id,
                email=f"cap-{user_id}@example.com",
                hashed_password=hash_password("pw12345678"),
            )
        )
        db.commit()
    headers = {"Authorization": f"Bearer {create_access_token(user_id)}"}
    return user_id, headers


def _cleanup(user_id: uuid.UUID) -> None:
    with SessionLocal() as db:
        db.query(User).filter(User.id == user_id).delete()
        db.commit()


@pytest.fixture
def user_a():
    uid, headers = _make_user()
    yield uid, headers
    _cleanup(uid)


@pytest.fixture
def user_b():
    uid, headers = _make_user()
    yield uid, headers
    _cleanup(uid)


def test_capture_without_jwt_returns_401():
    r = client.post("/agents/capture", json={"text": "hello"})
    assert r.status_code == 401


def test_capture_with_bad_jwt_returns_401():
    r = client.post(
        "/agents/capture",
        json={"text": "hello"},
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert r.status_code == 401


def test_capture_uses_jwt_user_and_ignores_body_user_id(user_a, user_b):
    """A token for user A must not be usable to write as user B."""
    uid_a, headers_a = user_a
    uid_b, _ = user_b

    # Patch the gateway so we don't need Ollama running. We capture the
    # GatewayRequest the endpoint builds and assert its user_id == uid_a,
    # regardless of what the body claims.
    seen: dict[str, uuid.UUID] = {}

    async def fake_process_request(self, req):  # noqa: ANN001
        seen["user_id"] = req.user_id

        class _Resp:
            final_status = "completed"
            text = '{"title": "stub", "type": "task"}'
            audit_log_id = None
            error = None

        return _Resp()

    with patch(
        "app.gateway.LocalAIGateway.process_request",
        new=fake_process_request,
    ):
        r = client.post(
            "/agents/capture",
            json={"text": "hello", "user_id": str(uid_b)},
            headers=headers_a,
        )

    assert r.status_code == 200, r.text
    assert seen["user_id"] == uid_a
    assert seen["user_id"] != uid_b


def test_capture_response_embeds_triage(user_a):
    """Slice 2: every capture response carries a triage interpretation."""
    _uid, headers = user_a

    async def fake_process_request(self, req):  # noqa: ANN001
        class _Resp:
            final_status = "completed"
            text = '{"title": "stub", "type": "task"}'
            audit_log_id = None
            error = None

        return _Resp()

    with patch(
        "app.gateway.LocalAIGateway.process_request",
        new=fake_process_request,
    ):
        r = client.post(
            "/agents/capture",
            json={"text": "Should I quit my job?"},
            headers=headers,
        )

    assert r.status_code == 200, r.text
    body = r.json()
    assert "triage" in body
    assert body["triage"]["kind"] == "decision"
    assert 0.0 <= body["triage"]["confidence"] <= 1.0


def test_triage_endpoint_requires_auth():
    r = client.post("/agents/triage", json={"text": "I feel heavy"})
    assert r.status_code == 401


def test_triage_endpoint_returns_kind(user_a):
    _uid, headers = user_a
    r = client.post(
        "/agents/triage",
        json={"text": "I feel heavy today"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["kind"] == "diary"


def test_auth_me_requires_auth():
    r = client.get("/auth/me")
    assert r.status_code == 401


def test_auth_me_returns_profile(user_a):
    uid, headers = user_a
    r = client.get("/auth/me", headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"] == str(uid)
    assert body["email"].startswith("cap-")
    # display_name is None for the test user (we don't set it in _make_user)
    assert "display_name" in body
