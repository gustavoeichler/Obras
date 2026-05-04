from datetime import datetime
from app.extensions import db

DOC_TYPES = ["invoice", "contract", "blueprint", "other"]


class Document(db.Model):
    __tablename__ = "document"

    id                = db.Column(db.Integer, primary_key=True)
    project_id        = db.Column(
        db.Integer, db.ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    name              = db.Column(db.String(200), nullable=False)
    type              = db.Column(db.String(50),  default="other")
    filename          = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255))
    file_size         = db.Column(db.Integer)
    mime_type         = db.Column(db.String(100))
    uploaded_at       = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    project = db.relationship("Project", backref="documents")
