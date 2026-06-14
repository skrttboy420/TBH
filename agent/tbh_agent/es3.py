"""Easy Save 3 (.es3) decryption + outer-layer parsing for TBH: Taskbar Hero.

The save is AES-128-CBC. The 16-byte IV is prepended to the ciphertext and is
also used as the PBKDF2 salt:

    key = PBKDF2-HMAC-SHA1(password, salt=IV, iterations=100, dkLen=16)

After decryption + PKCS7 unpad the payload is UTF-8 JSON (occasionally gzipped).
The outer JSON has three ES3 entries; the game data lives in `PlayerSaveData`,
whose `value` is itself a JSON *string* that must be parsed a second time.
"""

from __future__ import annotations

import gzip
import hashlib
import json
from typing import Any

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

# Verified against the live save. The game ships this password in the clear.
ES3_PASSWORD = "emuMqG3bLYJ938ZDCfieWJ"


def decrypt_es3(blob: bytes, password: str = ES3_PASSWORD) -> bytes:
    """Decrypt raw .es3 bytes to the plaintext JSON payload."""
    if len(blob) < 32:
        raise ValueError("ไฟล์ .es3 เล็กเกินไป (อาจเสียหาย)")
    iv = blob[:16]
    key = hashlib.pbkdf2_hmac("sha1", password.encode("utf-8"), iv, 100, dklen=16)
    decryptor = Cipher(algorithms.AES(key), modes.CBC(iv)).decryptor()
    plaintext = decryptor.update(blob[16:]) + decryptor.finalize()

    # Strip PKCS7 padding when present and well-formed.
    if plaintext:
        pad = plaintext[-1]
        if 1 <= pad <= 16 and plaintext[-pad:] == bytes([pad]) * pad:
            plaintext = plaintext[:-pad]

    if plaintext[:2] == b"\x1f\x8b":
        plaintext = gzip.decompress(plaintext)
    return plaintext


def load_es3_root(path: str, password: str = ES3_PASSWORD) -> dict[str, Any]:
    """Read + decrypt a .es3 file into the outer ES3 JSON object."""
    with open(path, "rb") as fh:
        blob = fh.read()
    return json.loads(decrypt_es3(blob, password).decode("utf-8"))


def _unwrap(node: Any) -> Any:
    """Unwrap an ES3 `{ "__type": ..., "value": ... }` entry."""
    if isinstance(node, dict) and "value" in node and "__type" in node:
        return node["value"]
    return node


def extract_player_save(root: dict[str, Any]) -> dict[str, Any]:
    """Return the doubly-decoded PlayerSaveData object (the real game state)."""
    node = root.get("PlayerSaveData")
    if node is None:
        raise ValueError("ไม่พบ PlayerSaveData ในไฟล์เซฟ")
    value = _unwrap(node)
    if isinstance(value, str):
        return json.loads(value)
    if isinstance(value, dict):
        return value
    raise ValueError("รูปแบบ PlayerSaveData ไม่ถูกต้อง")


def read_player_save(path: str, password: str = ES3_PASSWORD) -> dict[str, Any]:
    """Convenience: file path → parsed PlayerSaveData dict."""
    return extract_player_save(load_es3_root(path, password))
