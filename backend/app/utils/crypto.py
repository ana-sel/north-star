"""File encryption at rest — Fernet symmetric encryption.

Key is loaded from the FILES_ENCRYPTION_KEY setting. When the key is
empty/None, encryption is disabled (passthrough) so dev environments
work without setup.
"""
from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings


def _get_fernet() -> Fernet | None:
    """Return a Fernet instance or None if encryption is disabled."""
    key = settings.files_encryption_key
    if not key:
        return None
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_file(data: bytes) -> bytes:
    """Encrypt file data. Returns raw data if encryption key not set."""
    f = _get_fernet()
    if f is None:
        return data
    return f.encrypt(data)


def decrypt_file(data: bytes) -> bytes:
    """Decrypt file data. Returns raw data if encryption key not set."""
    f = _get_fernet()
    if f is None:
        return data
    return f.decrypt(data)


def generate_key() -> str:
    """Generate a new Fernet key (utility for setup)."""
    return Fernet.generate_key().decode()
