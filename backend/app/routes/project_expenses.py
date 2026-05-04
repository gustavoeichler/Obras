"""Project-scoped expense routes."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from marshmallow import ValidationError

from app.models.user import User
from app.schemas.expense import ExpenseSchema
from app.services import expense_service

bp = Blueprint("project_expenses", __name__, url_prefix="/api/projects/<int:project_id>/expenses")
schema      = ExpenseSchema()
schema_many = ExpenseSchema(many=True)


def _user():
    verify_jwt_in_request()
    return User.query.get_or_404(int(get_jwt_identity()))


@bp.get("")
def list_expenses(project_id):
    user = _user()
    category_id = request.args.get("category_id", type=int)
    stage_id    = request.args.get("stage_id",    type=int)
    supplier_id = request.args.get("supplier_id", type=int)
    expenses = expense_service.list_expenses(project_id, user, category_id, stage_id, supplier_id)
    return jsonify(schema_many.dump(expenses))


@bp.post("")
def create_expense(project_id):
    user = _user()
    try:
        data = schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    expense = expense_service.create_expense(project_id, data, user)
    return jsonify(schema.dump(expense)), 201


@bp.get("/<int:expense_id>")
def get_expense(project_id, expense_id):
    user = _user()
    return jsonify(schema.dump(expense_service.get_expense(project_id, expense_id, user)))


@bp.put("/<int:expense_id>")
def update_expense(project_id, expense_id):
    user = _user()
    try:
        data = schema.load(request.get_json() or {}, partial=True)
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    expense = expense_service.update_expense(project_id, expense_id, data, user)
    return jsonify(schema.dump(expense))


@bp.delete("/<int:expense_id>")
def delete_expense(project_id, expense_id):
    user = _user()
    expense_service.delete_expense(project_id, expense_id, user)
    return "", 204
