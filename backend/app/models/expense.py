from app.extensions import db


class Expense(db.Model):
    __tablename__ = "expense"

    id          = db.Column(db.Integer, primary_key=True)
    amount      = db.Column(db.Float, nullable=False)
    date        = db.Column(db.Date, nullable=False)
    description = db.Column(db.String(200))
    category_id = db.Column(db.Integer, db.ForeignKey("category.id"), nullable=True)
    stage_id    = db.Column(db.Integer, db.ForeignKey("stage.id"), nullable=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey("supplier.id"), nullable=True)
    project_id  = db.Column(
        db.Integer, db.ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    quantity    = db.Column(db.Float, nullable=True)
    unit        = db.Column(db.String(20), nullable=True)

    project = db.relationship("Project", backref="expenses")
