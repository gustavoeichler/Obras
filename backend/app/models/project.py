from datetime import datetime, timezone

from app.extensions import db


class Project(db.Model):
    __tablename__ = "project"

    id      = db.Column(db.Integer, primary_key=True)
    name    = db.Column(db.String(200), nullable=False, default="Minha Obra")
    area_m2 = db.Column(db.Float, nullable=True)

    # Multi-tenant fields (nullable for backwards compatibility with existing rows)
    professional_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    org_id          = db.Column(db.Integer, db.ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    description     = db.Column(db.Text, nullable=True)
    status          = db.Column(db.String(20), nullable=False, default="active")
    budget_total    = db.Column(db.Float, nullable=True)

    # Geo + region (used by RDO weather and supplier price benchmarks)
    lat             = db.Column(db.Float, nullable=True)
    lon             = db.Column(db.Float, nullable=True)
    location        = db.Column(db.String(120), nullable=True)  # human/region label, e.g. CEP prefix or city

    created_at      = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    clients     = db.relationship("ProjectClient", backref="project", lazy=True, cascade="all, delete-orphan")
    photos      = db.relationship("Photo",         backref="project", lazy=True, cascade="all, delete-orphan")
    invitations = db.relationship("Invitation",    backref="project", lazy=True, cascade="all, delete-orphan")
