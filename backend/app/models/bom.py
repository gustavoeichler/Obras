from datetime import datetime

from app.extensions import db


class BOMQuotation(db.Model):
    __tablename__ = "bom_quotation"

    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(120), nullable=False)
    project_id = db.Column(
        db.Integer, db.ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    project  = db.relationship("Project", backref="bom_quotations")
    products = db.relationship(
        "BOMProduct", backref="quotation",
        cascade="all, delete-orphan", order_by="BOMProduct.position",
    )
    stores = db.relationship(
        "BOMStore", backref="quotation",
        cascade="all, delete-orphan", order_by="BOMStore.position",
    )
    prices = db.relationship(
        "BOMPrice", backref="quotation",
        cascade="all, delete-orphan",
    )


class BOMProduct(db.Model):
    __tablename__ = "bom_product"

    id            = db.Column(db.Integer, primary_key=True)
    quotation_id  = db.Column(
        db.Integer, db.ForeignKey("bom_quotation.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    name     = db.Column(db.String(200), nullable=False)
    quantity = db.Column(db.Float, nullable=False, default=1.0)
    position = db.Column(db.Integer, nullable=False, default=0)


class BOMStore(db.Model):
    __tablename__ = "bom_store"

    id            = db.Column(db.Integer, primary_key=True)
    quotation_id  = db.Column(
        db.Integer, db.ForeignKey("bom_quotation.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    name          = db.Column(db.String(120), nullable=False)
    delivery_cost = db.Column(db.Float, nullable=False, default=0.0)
    position      = db.Column(db.Integer, nullable=False, default=0)


class BOMPrice(db.Model):
    __tablename__ = "bom_price"

    id           = db.Column(db.Integer, primary_key=True)
    quotation_id = db.Column(
        db.Integer, db.ForeignKey("bom_quotation.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    product_id = db.Column(
        db.Integer, db.ForeignKey("bom_product.id", ondelete="CASCADE"),
        nullable=False,
    )
    store_id = db.Column(
        db.Integer, db.ForeignKey("bom_store.id", ondelete="CASCADE"),
        nullable=False,
    )
    price = db.Column(db.Float, nullable=True)
