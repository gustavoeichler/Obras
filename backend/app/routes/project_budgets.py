"""Project-scoped budget routes."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from marshmallow import ValidationError

from app.models.user import User
from app.schemas.budget import BudgetSchema
from app.services import budget_service

bp = Blueprint("project_budgets", __name__, url_prefix="/api/projects/<int:project_id>/budgets")
schema = BudgetSchema()


def _user():
    verify_jwt_in_request()
    return User.query.get_or_404(int(get_jwt_identity()))


@bp.get("")
def list_budgets(project_id):
    return jsonify(budget_service.list_budgets(project_id, _user()))


@bp.post("")
def create_budget(project_id):
    user = _user()
    try:
        data = schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    try:
        budget = budget_service.create_budget(project_id, data, user)
    except ValueError as err:
        return jsonify({"errors": {"_": [str(err)]}}), 409
    return jsonify(budget), 201


@bp.get("/alerts")
def alerts(project_id):
    return jsonify(budget_service.list_alerts(project_id, _user()))


@bp.get("/breakdown")
def breakdown(project_id):
    return jsonify({"data": budget_service.get_breakdown(project_id, _user())})


@bp.get("/<int:budget_id>")
def get_budget(project_id, budget_id):
    return jsonify(budget_service.get_budget(project_id, budget_id, _user()))


@bp.put("/<int:budget_id>")
def update_budget(project_id, budget_id):
    user = _user()
    try:
        data = schema.load(request.get_json() or {}, partial=True)
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    return jsonify(budget_service.update_budget(project_id, budget_id, data, user))


@bp.delete("/<int:budget_id>")
def delete_budget(project_id, budget_id):
    budget_service.delete_budget(project_id, budget_id, _user())
    return "", 204
