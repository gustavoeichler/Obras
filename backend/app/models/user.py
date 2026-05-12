from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db


class User(db.Model):
    __tablename__ = "users"

    id            = db.Column(db.Integer, primary_key=True)
    email         = db.Column(db.String(254), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role          = db.Column(db.String(20), nullable=False)  # 'professional' | 'client'
    logo_path     = db.Column(db.String(255), nullable=True)  # whitelabel brand logo (also embedded in PDFs)
    brand_name           = db.Column(db.String(80),  nullable=True)
    brand_color_primary  = db.Column(db.String(7),   nullable=True)  # hex, e.g. '#d4a017'
    brand_default_theme  = db.Column(db.String(10),  nullable=True)  # 'light' | 'dark'
    theme_preference     = db.Column(db.String(10),  nullable=True)  # viewer override
    created_at    = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)
