from datetime import datetime, timezone

from app.extensions import db


class DailyReportNote(db.Model):
    __tablename__ = "daily_report_note"

    id              = db.Column(db.Integer, primary_key=True)
    daily_report_id = db.Column(
        db.Integer, db.ForeignKey("daily_report.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    stage_id        = db.Column(
        db.Integer, db.ForeignKey("stage.id", ondelete="SET NULL"), nullable=True,
    )
    task_id         = db.Column(
        db.Integer, db.ForeignKey("task.id", ondelete="SET NULL"), nullable=True,
    )
    comment         = db.Column(db.Text, nullable=False)
    created_at      = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False,
    )
