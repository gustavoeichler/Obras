from datetime import datetime
from app.extensions import db


class Task(db.Model):
    __tablename__ = "task"

    id         = db.Column(db.Integer, primary_key=True)
    stage_id   = db.Column(db.Integer, db.ForeignKey("stage.id"), nullable=False)
    project_id = db.Column(
        db.Integer, db.ForeignKey("project.id", ondelete="CASCADE"),
        nullable=True, index=True,
    )
    name       = db.Column(db.String(200), nullable=False)
    is_done    = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    stage = db.relationship("Stage", backref="tasks", lazy=True)
