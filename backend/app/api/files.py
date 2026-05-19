"""Files API — spec §9 Files (private storage).

Files are stored on the local disk under a per-user folder, keyed by a
random UUID filename so the on-disk layout doesn't leak the original
name. The DB row holds metadata + the storage path. Privacy level is
always PRIVATE — the gateway / external-AI policy never sees these
contents.

Files are encrypted at rest using Fernet symmetric encryption when
FILES_ENCRYPTION_KEY is set. Without the key, files are stored in
plaintext (dev-mode passthrough).
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File as UploadFile_,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.enums import PrivacyLevel
from app.models.file import File as FileModel
from app.utils.crypto import decrypt_file, encrypt_file


router = APIRouter(prefix="/files", tags=["files"])


class FileOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    filename: str
    mime_type: str | None
    size_bytes: int | None
    category: str | None
    privacy_level: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
def _user_dir(user_id: uuid.UUID) -> Path:
    root = Path(settings.files_storage_root) / str(user_id)
    root.mkdir(parents=True, exist_ok=True)
    return root


def _resolve_safe(path_str: str, user_id: uuid.UUID) -> Path:
    """Resolve a stored path and verify it sits inside the user's dir."""
    user_root = _user_dir(user_id).resolve()
    path = Path(path_str).resolve()
    try:
        path.relative_to(user_root)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid storage path")
    return path


@router.get("", response_model=list[FileOut])
def list_files(
    user_id: uuid.UUID = Query(...),
    category: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[FileModel]:
    stmt = select(FileModel).where(FileModel.user_id == user_id)
    if category is not None:
        stmt = stmt.where(FileModel.category == category)
    stmt = stmt.order_by(FileModel.created_at.desc())
    return list(db.execute(stmt).scalars())


@router.post("", response_model=FileOut, status_code=status.HTTP_201_CREATED)
async def upload_file(
    user_id: uuid.UUID = Form(...),
    category: str | None = Form(default=None),
    file: UploadFile = UploadFile_(...),
    db: Session = Depends(get_db),
) -> FileModel:
    contents = await file.read()
    if len(contents) > settings.files_max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {settings.files_max_bytes} bytes",
        )

    user_root = _user_dir(user_id)
    storage_name = f"{uuid.uuid4()}{Path(file.filename or '').suffix}"
    storage_path = user_root / storage_name
    storage_path.write_bytes(encrypt_file(contents))

    row = FileModel(
        user_id=user_id,
        filename=file.filename or storage_name,
        storage_path=str(storage_path.resolve()),
        mime_type=file.content_type,
        size_bytes=len(contents),
        category=category,
        privacy_level=PrivacyLevel.PRIVATE,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/{file_id}/download")
def download_file(
    file_id: uuid.UUID,
    user_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
) -> Response:
    row = db.get(FileModel, file_id)
    if row is None or row.user_id != user_id:
        raise HTTPException(status_code=404, detail="File not found")
    path = _resolve_safe(row.storage_path, user_id)
    if not path.exists():
        raise HTTPException(status_code=410, detail="File missing on disk")
    raw = path.read_bytes()
    decrypted = decrypt_file(raw)
    return Response(
        content=decrypted,
        media_type=row.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{row.filename}"',
        },
    )


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    file_id: uuid.UUID,
    user_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
) -> Response:
    row = db.get(FileModel, file_id)
    if row is None or row.user_id != user_id:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        path = _resolve_safe(row.storage_path, user_id)
        if path.exists():
            path.unlink()
    except HTTPException:
        # Stored path was outside user dir — refuse to act on it but
        # still drop the DB row so the user can clean up their list.
        pass
    db.delete(row)
    db.commit()
    return Response(status_code=204)
