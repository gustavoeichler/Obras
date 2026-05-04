from datetime import datetime, timezone

from app.extensions import db


class Invitation(db.Model):
    __tablename__ = "invitations"

    id         = db.Column(db.Integer, primary_key=True)
    email      = db.Column(db.String(254), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id", ondelete="CASCADE"), nullable=False)
    token      = db.Column(db.String(64), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    accepted   = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
