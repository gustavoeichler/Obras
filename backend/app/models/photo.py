from datetime import datetime, timezone

from app.extensions import db


class Photo(db.Model):
    __tablename__ = "photos"

    id                = db.Column(db.Integer, primary_key=True)
    project_id        = db.Column(db.Integer, db.ForeignKey("project.id", ondelete="CASCADE"), nullable=False)
    stage_id          = db.Column(db.Integer, db.ForeignKey("stage.id",   ondelete="SET NULL"), nullable=True)
    uploaded_by       = db.Column(db.Integer, db.ForeignKey("users.id",   ondelete="SET NULL"), nullable=True)

    filename          = db.Column(db.String(255), nullable=True)   # null = text-only post
    original_filename = db.Column(db.String(255))
    description       = db.Column(db.Text)
    type              = db.Column(db.String(20), default="progress")
    visibility        = db.Column(db.String(20), default="public")
    daily_report_id   = db.Column(
        db.Integer, db.ForeignKey("daily_report.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    created_at        = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    daily_report = db.relationship("DailyReport", backref="photos", lazy=True)
