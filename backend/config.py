import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


def _normalize_db_url(url: str) -> str:
    # SQLAlchemy 1.4+ requires the postgresql:// scheme (not postgres://)
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://"):]
    return url


class Config:
    SQLALCHEMY_DATABASE_URI = _normalize_db_url(
        os.environ.get(
            "DATABASE_URL",
            "postgresql://postgres.udcxcawdkqfcitizunnc:!Vascoda4262!@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
        )
    )
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
    }
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_SORT_KEYS = False
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB

    JWT_SECRET_KEY          = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-in-prod")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
