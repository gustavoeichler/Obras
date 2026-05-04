"""Project-scoped analytics routes."""
from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.models.user import User
from app.services import analytics_service

bp = Blueprint("project_analytics", __name__, url_prefix="/api/projects/<int:project_id>/analytics")


def _user():
    verify_jwt_in_request()
    return User.query.get_or_404(int(get_jwt_identity()))


@bp.get("/s-curve")
def s_curve(project_id):
    return jsonify(analytics_service.s_curve(project_id, _user()))


@bp.get("/cost-per-m2")
def cost_per_m2(project_id):
    data = analytics_service.cost_per_m2(project_id, _user())
    if "error" in data:
        return jsonify(data), 422
    return jsonify(data)


@bp.get("/budget-deviation")
def budget_deviation(project_id):
    data = analytics_service.budget_deviation(project_id, _user())
    if "error" in data:
        return jsonify(data), 422
    return jsonify(data)


@bp.get("/forecast")
def forecast(project_id):
    return jsonify(analytics_service.forecast(project_id, _user()))


@bp.get("/summary")
def summary(project_id):
    user = _user()
    return jsonify({
        "s_curve":          analytics_service.s_curve(project_id, user),
        "cost_per_m2":      analytics_service.cost_per_m2(project_id, user),
        "budget_deviation": analytics_service.budget_deviation(project_id, user),
        "forecast":         analytics_service.forecast(project_id, user),
    })
