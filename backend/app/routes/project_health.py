"""Project health score — used for the 'Saúde da Obra' dashboard card."""
from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.middleware.auth import authorize_project_access, check_project_access
from app.models.project import Project
from app.models.project_client import ProjectClient
from app.models.user import User
from app.services import health_service

bp = Blueprint("project_health", __name__)


@bp.get("/api/projects/<int:project_id>/health")
@authorize_project_access
def get_health(project_id: int):
    return jsonify({"project_id": project_id, **health_service.project_health(project_id)})


@bp.get("/api/projects/health-summary")
def health_summary():
    verify_jwt_in_request()
    user = User.query.get_or_404(int(get_jwt_identity()))

    if user.role == "professional":
        projects = Project.query.filter_by(professional_id=user.id).all()
    else:
        ids = [pc.project_id for pc in ProjectClient.query.filter_by(client_id=user.id).all()]
        projects = Project.query.filter(Project.id.in_(ids)).all() if ids else []

    out = []
    for p in projects:
        h = health_service.project_health(p.id)
        out.append({
            "project_id": p.id,
            "name":       p.name,
            "overall":    h["overall"],
            "status":     h["status"],
        })
    return jsonify(out)
