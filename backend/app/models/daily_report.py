from datetime import datetime, timezone

from app.extensions import db


class DailyReport(db.Model):
    __tablename__ = "daily_report"

    id              = db.Column(db.Integer, primary_key=True)
    project_id      = db.Column(
        db.Integer, db.ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    report_date     = db.Column(db.Date, nullable=False, index=True)

    weather         = db.Column(db.String(80), nullable=True)
    weather_temp_c  = db.Column(db.Float, nullable=True)

    headcount_json  = db.Column(db.JSON, nullable=True)  # [{role: 'pedreiro', count: 3}]
    notes           = db.Column(db.Text, nullable=True)

    created_by_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    pdf_document_id = db.Column(
        db.Integer, db.ForeignKey("document.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    project      = db.relationship("Project", backref="daily_reports", lazy=True)
    created_by   = db.relationship("User", foreign_keys=[created_by_user_id], lazy="joined")
    pdf_document = db.relationship("Document", foreign_keys=[pdf_document_id], lazy="joined")
    occurrences  = db.relationship(
        "DailyReportOccurrence",
        backref="daily_report",
        lazy=True,
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        db.UniqueConstraint("project_id", "report_date", name="uq_daily_report_project_date"),
    )
