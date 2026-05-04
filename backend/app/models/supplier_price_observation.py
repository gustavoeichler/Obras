from datetime import datetime, timezone

from app.extensions import db


class SupplierPriceObservation(db.Model):
    """One observation per priced expense, used for anonymized benchmarking."""

    __tablename__ = "supplier_price_observation"

    id              = db.Column(db.Integer, primary_key=True)
    expense_id      = db.Column(
        db.Integer, db.ForeignKey("expense.id", ondelete="CASCADE"),
        nullable=False, unique=True, index=True,
    )
    professional_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    category_id     = db.Column(
        db.Integer, db.ForeignKey("category.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    supplier_id     = db.Column(
        db.Integer, db.ForeignKey("supplier.id", ondelete="SET NULL"), nullable=True,
    )
    unit            = db.Column(db.String(20), nullable=True, index=True)
    unit_price      = db.Column(db.Float, nullable=False)
    quantity        = db.Column(db.Float, nullable=True)
    region_code     = db.Column(db.String(120), nullable=True, index=True)
    observed_at     = db.Column(db.Date, nullable=False, index=True)

    created_at      = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False,
    )
