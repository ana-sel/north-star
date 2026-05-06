"""Tests for the Files API."""
from __future__ import annotations

import io
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.db import SessionLocal
from app.main import app
from app.models.file import File as FileModel
from app.models.user import User


client = TestClient(app)


@pytest.fixture
def tmp_storage(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "files_storage_root", str(tmp_path))
    yield tmp_path


@pytest.fixture
def dev_user(tmp_storage):
    user_id = uuid.uuid4()
    with SessionLocal() as db:
        db.add(User(id=user_id, email=f"files-{user_id}@test.local"))
        db.commit()
    yield user_id
    with SessionLocal() as db:
        db.query(FileModel).filter(FileModel.user_id == user_id).delete()
        db.query(User).filter(User.id == user_id).delete()
        db.commit()


def _upload(user_id: str, name: str, contents: bytes, category: str | None = None):
    files = {"file": (name, io.BytesIO(contents), "text/plain")}
    data = {"user_id": user_id}
    if category is not None:
        data["category"] = category
    return client.post("/files", data=data, files=files)


def test_upload_list_download_delete(dev_user, tmp_storage):
    user_id = str(dev_user)

    resp = _upload(user_id, "notes.txt", b"hello world", "notes")
    assert resp.status_code == 201, resp.text
    row = resp.json()
    assert row["filename"] == "notes.txt"
    assert row["size_bytes"] == 11
    assert row["category"] == "notes"
    assert row["privacy_level"].lower() == "private"

    # Disk write happened in the user's tmp folder
    user_root = Path(tmp_storage) / user_id
    assert user_root.exists()
    assert any(user_root.iterdir())

    # List
    resp = client.get("/files", params={"user_id": user_id})
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    # Download returns the original bytes
    resp = client.get(
        f"/files/{row['id']}/download", params={"user_id": user_id}
    )
    assert resp.status_code == 200
    assert resp.content == b"hello world"

    # Delete removes both DB row and disk file
    resp = client.delete(
        f"/files/{row['id']}", params={"user_id": user_id}
    )
    assert resp.status_code == 204
    resp = client.get("/files", params={"user_id": user_id})
    assert resp.json() == []
    assert not any(user_root.iterdir())


def test_category_filter(dev_user):
    user_id = str(dev_user)
    _upload(user_id, "a.txt", b"a", "tax")
    _upload(user_id, "b.txt", b"b", "id")
    _upload(user_id, "c.txt", b"c", "tax")

    resp = client.get("/files", params={"user_id": user_id, "category": "tax"})
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) == 2
    assert all(r["category"] == "tax" for r in rows)


def test_download_other_users_file_returns_404(dev_user):
    other_id = uuid.uuid4()
    with SessionLocal() as db:
        db.add(User(id=other_id, email=f"other-{other_id}@test.local"))
        db.commit()
    try:
        # Upload to dev_user, then ask for it as other_id
        resp = _upload(str(dev_user), "secret.txt", b"shh")
        file_id = resp.json()["id"]

        resp = client.get(
            f"/files/{file_id}/download", params={"user_id": str(other_id)}
        )
        assert resp.status_code == 404
    finally:
        with SessionLocal() as db:
            db.query(FileModel).filter(FileModel.user_id == other_id).delete()
            db.query(User).filter(User.id == other_id).delete()
            db.commit()


def test_oversize_rejected(dev_user, monkeypatch):
    monkeypatch.setattr(settings, "files_max_bytes", 8)
    resp = _upload(str(dev_user), "big.bin", b"x" * 100)
    assert resp.status_code == 413
