from app.extensions import db

STAGE_STATUSES = ('nao_iniciada', 'em_andamento', 'concluida')


class Stage(db.Model):
    __tablename__ = "stage"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(
        db.Integer, db.ForeignKey("project.id", ondelete="CASCADE"),
        nullable=True, index=True,
    )
    name = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(20), default="nao_iniciada")
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    planned_start_date = db.Column(db.Date)
    planned_end_date = db.Column(db.Date)
    
    # Workflow fields
    order = db.Column(db.Integer, nullable=True, index=True)  # Stage sequence within project (1, 2, 3...)
    parent_stage_id = db.Column(
        db.Integer, db.ForeignKey("stage.id", ondelete="SET NULL"),
        nullable=True, index=True
    )  # For stage dependencies
    is_locked = db.Column(db.Boolean, default=False, nullable=False)  # Prevent editing once started
    completion_pct = db.Column(db.Integer, default=0, nullable=False)  # Calculated from checklists (0-100)

    project  = db.relationship("Project", backref="stages", lazy=True)
    expenses = db.relationship("Expense", backref="stage", lazy=True)
    parent_stage = db.relationship(
        "Stage", remote_side=[id], backref="dependent_stages", lazy=True
    )
