from datetime import datetime, timezone

from app.extensions import db

OCCURRENCE_KINDS = (
    "delay", "material_shortage", "weather", "accident", "rework", "other",
)


class DailyReportOccurrence(db.Model):
    __tablename__ = "daily_report_occurrence"

    id               = db.Column(db.Integer, primary_key=True)
    daily_report_id  = db.Column(
        db.Integer, db.ForeignKey("daily_report.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    kind             = db.Column(db.String(30), nullable=False)
    description      = db.Column(db.Text, nullable=False)
    stage_id         = db.Column(
        db.Integer, db.ForeignKey("stage.id", ondelete="SET NULL"), nullable=True,
    )
    task_id          = db.Column(
        db.Integer, db.ForeignKey("task.id", ondelete="SET NULL"), nullable=True,
    )
    created_at       = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False,
    )
