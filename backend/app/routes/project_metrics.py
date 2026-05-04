"""EPIC 4 — Métricas routes.

GET /api/projects/<id>/metrics             — totals
GET /api/projects/<id>/metrics/by-category — grouped breakdown
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.models.user import User
from app.services import metrics_service

bp = Blueprint("project_metrics", __name__)


def _current_user():
    verify_jwt_in_request()
    return User.query.get_or_404(int(get_jwt_identity()))


@bp.get("/api/projects/<int:project_id>/metrics")
def metrics(project_id: int):
    user = _current_user()
    return jsonify(metrics_service.project_metrics(project_id, user))


@bp.get("/api/projects/<int:project_id>/metrics/by-category")
def by_category(project_id: int):
    user = _current_user()
    return jsonify(metrics_service.grouped_by_category(project_id, user))
