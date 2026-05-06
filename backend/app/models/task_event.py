from datetime import datetime, timezone

from app.extensions import db


class TaskEvent(db.Model):
    __tablename__ = "task_event"

    id          = db.Column(db.Integer, primary_key=True)
    task_id     = db.Column(db.Integer, db.ForeignKey("task.id",    ondelete="CASCADE"),  nullable=False, index=True)
    stage_id    = db.Column(db.Integer, db.ForeignKey("stage.id",   ondelete="SET NULL"), nullable=True)
    project_id  = db.Column(db.Integer, db.ForeignKey("project.id", ondelete="CASCADE"),  nullable=False, index=True)
    action      = db.Column(db.String(20),  nullable=False)   # "created" | "closed" | "reopened"
    task_name   = db.Column(db.String(200), nullable=False)   # snapshot at event time
    user_id     = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    occurred_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
