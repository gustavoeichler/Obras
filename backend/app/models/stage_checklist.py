from datetime import datetime
from app.extensions import db


class StageChecklistItem(db.Model):
    __tablename__ = "stage_checklist_item"

    id = db.Column(db.Integer, primary_key=True)
    stage_id = db.Column(
        db.Integer, db.ForeignKey("stage.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    description = db.Column(db.String(500), nullable=False)
    is_completed = db.Column(db.Boolean, default=False, nullable=False)
    completed_by_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    stage = db.relationship("Stage", backref="checklist_items", lazy=True)
    completed_by_user = db.relationship("User", lazy="joined")
