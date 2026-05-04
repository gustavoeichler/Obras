from app.extensions import db


class Supplier(db.Model):
    __tablename__ = "supplier"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(
        db.Integer, db.ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50))
    contact = db.Column(db.String(100))

    project = db.relationship("Project", backref="suppliers")
    expenses = db.relationship("Expense", backref="supplier", lazy=True)
