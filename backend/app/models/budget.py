from datetime import datetime
from app.extensions import db


class Budget(db.Model):
    __tablename__ = "budget"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(
        db.Integer, db.ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    category_id = db.Column(db.Integer, db.ForeignKey("category.id"), nullable=True)
    stage_id = db.Column(db.Integer, db.ForeignKey("stage.id"), nullable=True)
    planned_amount = db.Column(db.Float, nullable=False)
    payment_milestone_pct = db.Column(db.Float, default=100.0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    project = db.relationship("Project", backref="budgets")
    category = db.relationship("Category", backref="budgets", lazy="joined")
    stage = db.relationship("Stage", backref="budgets", lazy="joined")
