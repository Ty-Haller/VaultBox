"""Password-based encryption for backup archives."""

from __future__ import annotations

import os
import struct

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

MAGIC = b'VBOX1'
SALT_LEN = 16
NONCE_LEN = 12
PBKDF2_ITERATIONS = 600_000


class BackupCryptoError(Exception):
    pass


def _derive_key(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=PBKDF2_ITERATIONS,
    )
    return kdf.derive(password.encode('utf-8'))


def encrypt_bytes(data: bytes, password: str) -> bytes:
    salt = os.urandom(SALT_LEN)
    nonce = os.urandom(NONCE_LEN)
    key = _derive_key(password, salt)
    ciphertext = AESGCM(key).encrypt(nonce, data, None)
    return MAGIC + salt + nonce + ciphertext


def decrypt_bytes(data: bytes, password: str) -> bytes:
    if len(data) < len(MAGIC) + SALT_LEN + NONCE_LEN + 16:
        raise BackupCryptoError('Invalid encrypted backup file.')
    if data[: len(MAGIC)] != MAGIC:
        raise BackupCryptoError('Not a VaultBox encrypted backup.')
    offset = len(MAGIC)
    salt = data[offset : offset + SALT_LEN]
    offset += SALT_LEN
    nonce = data[offset : offset + NONCE_LEN]
    offset += NONCE_LEN
    ciphertext = data[offset:]
    key = _derive_key(password, salt)
    try:
        return AESGCM(key).decrypt(nonce, ciphertext, None)
    except Exception as exc:
        raise BackupCryptoError('Incorrect password or corrupted backup.') from exc


def encrypt_file(src_path: str, dest_path: str, password: str) -> None:
    with open(src_path, 'rb') as f:
        plaintext = f.read()
    encrypted = encrypt_bytes(plaintext, password)
    with open(dest_path, 'wb') as f:
        f.write(encrypted)


def decrypt_file(src_path: str, dest_path: str, password: str) -> None:
    with open(src_path, 'rb') as f:
        data = f.read()
    plaintext = decrypt_bytes(data, password)
    with open(dest_path, 'wb') as f:
        f.write(plaintext)