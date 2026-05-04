from datetime import datetime
from app.extensions import db

APPROVAL_STATUSES = ('pending', 'approved', 'rejected')
APPROVAL_ROLES = ('engineer', 'client_rep', 'supervisor', 'inspector')


class StageApproval(db.Model):
    __tablename__ = "stage_approval"

    id = db.Column(db.Integer, primary_key=True)
    stage_id = db.Column(
        db.Integer, db.ForeignKey("stage.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    required_role = db.Column(db.String(20), nullable=False)  # engineer, client_rep, etc.
    status = db.Column(db.String(20), default="pending", nullable=False)  # pending, approved, rejected
    approved_by_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    approval_date = db.Column(db.DateTime, nullable=True)
    rejection_reason = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    stage = db.relationship("Stage", backref="approvals", lazy=True)
    approved_by_user = db.relationship("User", lazy="joined")
