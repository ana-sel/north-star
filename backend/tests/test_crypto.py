"""Tests for file encryption at rest."""
from __future__ import annotations

import pytest
from cryptography.fernet import Fernet

from app.utils.crypto import decrypt_file, encrypt_file, generate_key


@pytest.fixture(autouse=True)
def _enable_encryption(monkeypatch):
    """Enable encryption with a test key for all tests in this module."""
    key = Fernet.generate_key().decode()
    monkeypatch.setattr("app.utils.crypto.settings.files_encryption_key", key)


def test_roundtrip():
    data = b"Hello, encrypted world!"
    encrypted = encrypt_file(data)
    assert encrypted != data
    assert decrypt_file(encrypted) == data


def test_empty_bytes():
    data = b""
    encrypted = encrypt_file(data)
    assert decrypt_file(encrypted) == data


def test_large_payload():
    data = b"x" * (5 * 1024 * 1024)  # 5 MB
    encrypted = encrypt_file(data)
    assert decrypt_file(encrypted) == data


def test_wrong_key_fails(monkeypatch):
    data = b"secret stuff"
    encrypted = encrypt_file(data)
    # Switch to a different key
    monkeypatch.setattr(
        "app.utils.crypto.settings.files_encryption_key",
        Fernet.generate_key().decode(),
    )
    with pytest.raises(Exception):
        decrypt_file(encrypted)


def test_passthrough_when_no_key(monkeypatch):
    """When key is empty, data passes through unmodified."""
    monkeypatch.setattr("app.utils.crypto.settings.files_encryption_key", "")
    data = b"plaintext"
    assert encrypt_file(data) == data
    assert decrypt_file(data) == data


def test_generate_key():
    key = generate_key()
    assert len(key) == 44  # Fernet keys are 44 base64 chars
    # Should be valid
    Fernet(key.encode())
