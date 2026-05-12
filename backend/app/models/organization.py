from datetime import datetime, timezone

from app.extensions import db


class Organization(db.Model):
    __tablename__ = "organizations"

    id                  = db.Column(db.Integer, primary_key=True)
    name                = db.Column(db.String(120), nullable=False)
    logo_path           = db.Column(db.String(255), nullable=True)
    brand_name          = db.Column(db.String(80),  nullable=True)
    brand_color_primary = db.Column(db.String(7),   nullable=True)   # hex e.g. '#d4a017'
    brand_default_theme = db.Column(db.String(10),  nullable=True)   # 'light' | 'dark'
    is_active           = db.Column(db.Boolean, default=True, nullable=False, server_default="true")
    plan                = db.Column(db.String(20),  nullable=True)   # 'basic' | 'pro' | 'enterprise'
    plan_expires_at     = db.Column(db.DateTime, nullable=True)
    admin_notes         = db.Column(db.Text, nullable=True)
    created_at          = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    projects            = db.relationship("Project", backref="org", lazy=True)
