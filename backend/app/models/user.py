from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db


class User(db.Model):
    __tablename__ = "users"

    id            = db.Column(db.Integer, primary_key=True)
    email         = db.Column(db.String(254), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role          = db.Column(db.String(20), nullable=False)  # 'professional' | 'client'
    org_id        = db.Column(db.Integer, db.ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    is_org_admin  = db.Column(db.Boolean, default=False, nullable=False, server_default="false")
    is_superadmin = db.Column(db.Boolean, default=False, nullable=False, server_default="false")
    theme_preference = db.Column(db.String(10), nullable=True)  # viewer override
    created_at    = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    org = db.relationship("Organization", backref="members", foreign_keys=[org_id])

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)
