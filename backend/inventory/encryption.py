import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


def _derive_key(secret: str) -> bytes:
    digest = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(digest)


def get_fernet() -> Fernet:
    return Fernet(_derive_key(settings.VAULTBOX_ENCRYPTION_KEY))


def encrypt_value(plaintext: str) -> str:
    if not plaintext:
        return ''
    return get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    if not ciphertext:
        return ''
    try:
        return get_fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken:
        return ''