from app.extensions import db


class ProjectClient(db.Model):
    __tablename__ = "project_clients"

    id         = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id", ondelete="CASCADE"), nullable=False)
    client_id  = db.Column(db.Integer, db.ForeignKey("users.id",   ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        db.UniqueConstraint("project_id", "client_id", name="uq_project_client"),
    )
