"""Signed, time-limited share links — used for public RDO/boletim views."""
from __future__ import annotations

from flask import current_app
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer


def _serializer() -> URLSafeTimedSerializer:
    secret = current_app.config.get("JWT_SECRET_KEY") or "dev-secret-change-in-prod"
    return URLSafeTimedSerializer(secret, salt="obras-share-link")


def issue(payload: dict) -> str:
    return _serializer().dumps(payload)


def parse(token: str, max_age_seconds: int = 14 * 24 * 3600) -> dict | None:
    try:
        return _serializer().loads(token, max_age=max_age_seconds)
    except (BadSignature, SignatureExpired):
        return None
