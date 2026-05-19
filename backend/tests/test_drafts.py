"""Tests for chat redesign slice 3: drafts table + Sort-mode tray.

Covers:
- draft_builder splits Sort-mode messages into 1+ candidates
- Capture endpoint auto-creates Draft rows only when triage.kind == sort
- /drafts list returns only the current user's rows
- accept / dismiss / archive transition state; cross-user 404
"""
from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.auth import create_access_token, hash_password
from app.db import SessionLocal
from app.main import app
from app.models.draft import Draft
from app.models.user import User
from app.services.draft_builder import split_into_drafts


client = TestClient(app)


# --- unit tests for the splitter ----------------------------------


def test_split_single_thought_returns_one_draft():
    out = split_into_drafts("Buy milk")
    assert len(out) == 1
    assert out[0].title == "Buy milk"


def test_split_bullet_list():
    out = split_into_drafts("- pay rent\n- call mum\n- book dentist")
    assert [d.title for d in out] == ["pay rent", "call mum", "book dentist"]


def test_split_numbered_list():
    out = split_into_drafts("1. ship PR\n2) review notes\n3. log energy")
    assert [d.title for d in out] == ["ship PR", "review notes", "log energy"]


def test_split_semicolons():
    out = split_into_drafts("pay rent; call mum; book dentist")
    assert [d.title for d in out] == ["pay rent", "call mum", "book dentist"]


def test_split_caps_at_eight_fragments():
    text = "\n".join(f"- task {i}" for i in range(20))
    out = split_into_drafts(text)
    assert len(out) == 8


def test_split_drops_too_short_fragments():
    out = split_into_drafts("- a\n- ok\n- meaningful item")
    titles = [d.title for d in out]
    assert "meaningful item" in titles
    assert "a" not in titles


def test_split_empty_string_returns_empty():
    assert split_into_drafts("") == []
    assert split_into_drafts("   ") == []


# --- endpoint tests -----------------------------------------------


def _make_user() -> tuple[uuid.UUID, dict[str, str]]:
    user_id = uuid.uuid4()
    with SessionLocal() as db:
        db.add(
            User(
                id=user_id,
                email=f"draft-{user_id}@example.com",
                hashed_password=hash_password("pw12345678"),
            )
        )
        db.commit()
    headers = {"Authorization": f"Bearer {create_access_token(user_id)}"}
    return user_id, headers


def _cleanup(user_id: uuid.UUID) -> None:
    with SessionLocal() as db:
        db.query(Draft).filter(Draft.user_id == user_id).delete()
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


def _stub_gateway():
    async def fake_process_request(self, req):  # noqa: ANN001
        class _Resp:
            final_status = "completed"
            text = '{"title": "stub", "type": "task"}'
            audit_log_id = None
            error = None

        return _Resp()

    return patch(
        "app.gateway.LocalAIGateway.process_request",
        new=fake_process_request,
    )


def test_capture_sort_creates_drafts(user_a):
    _uid, headers = user_a
    with _stub_gateway():
        r = client.post(
            "/agents/capture",
            json={"text": "Sort these: pay rent; call mum; book dentist"},
            headers=headers,
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["triage"]["kind"] == "sort"
    assert len(body["drafts"]) >= 2
    for d in body["drafts"]:
        assert d["state"] == "new"
        assert d["id"]


def test_capture_non_sort_does_not_create_drafts(user_a):
    _uid, headers = user_a
    with _stub_gateway():
        r = client.post(
            "/agents/capture",
            json={"text": "I feel heavy today"},
            headers=headers,
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["triage"]["kind"] == "diary"
    assert body["drafts"] == []


def test_list_drafts_returns_only_own(user_a, user_b):
    _uid_a, headers_a = user_a
    _uid_b, headers_b = user_b
    with _stub_gateway():
        client.post(
            "/agents/capture",
            json={"text": "Sort: rent; mum; dentist"},
            headers=headers_a,
        )
        client.post(
            "/agents/capture",
            json={"text": "Sort: laundry; gym"},
            headers=headers_b,
        )

    r_a = client.get("/drafts", headers=headers_a)
    r_b = client.get("/drafts", headers=headers_b)
    assert r_a.status_code == 200
    assert r_b.status_code == 200
    titles_a = {d["title"] for d in r_a.json()}
    titles_b = {d["title"] for d in r_b.json()}
    assert "rent" in titles_a and "mum" in titles_a
    assert "laundry" in titles_b and "gym" in titles_b
    assert titles_a.isdisjoint(titles_b)


def test_list_drafts_requires_auth():
    assert client.get("/drafts").status_code == 401


def test_accept_draft_transitions_state(user_a):
    _uid, headers = user_a
    with _stub_gateway():
        r = client.post(
            "/agents/capture",
            json={"text": "Sort: pay rent; call mum"},
            headers=headers,
        )
    draft_id = r.json()["drafts"][0]["id"]
    r2 = client.post(f"/drafts/{draft_id}/accept", headers=headers)
    assert r2.status_code == 200
    assert r2.json()["state"] == "accepted"

    # Second accept conflicts.
    r3 = client.post(f"/drafts/{draft_id}/accept", headers=headers)
    assert r3.status_code == 409


def test_dismiss_and_archive_endpoints(user_a):
    _uid, headers = user_a
    with _stub_gateway():
        r = client.post(
            "/agents/capture",
            json={"text": "Sort: a thing; another thing"},
            headers=headers,
        )
    ids = [d["id"] for d in r.json()["drafts"]]
    assert len(ids) >= 2

    r_dismiss = client.post(f"/drafts/{ids[0]}/dismiss", headers=headers)
    assert r_dismiss.status_code == 200
    assert r_dismiss.json()["state"] == "dismissed"

    r_arch = client.post(f"/drafts/{ids[1]}/archive", headers=headers)
    assert r_arch.status_code == 200
    assert r_arch.json()["state"] == "archived_insight"


def test_cross_user_accept_returns_404(user_a, user_b):
    _uid_a, headers_a = user_a
    _uid_b, headers_b = user_b
    with _stub_gateway():
        r = client.post(
            "/agents/capture",
            json={"text": "Sort: rent; mum"},
            headers=headers_a,
        )
    draft_id = r.json()["drafts"][0]["id"]
    r2 = client.post(f"/drafts/{draft_id}/accept", headers=headers_b)
    assert r2.status_code == 404


def test_accept_requires_auth(user_a):
    _uid, headers = user_a
    with _stub_gateway():
        r = client.post(
            "/agents/capture",
            json={"text": "Sort: rent; mum"},
            headers=headers,
        )
    draft_id = r.json()["drafts"][0]["id"]
    assert client.post(f"/drafts/{draft_id}/accept").status_code == 401
