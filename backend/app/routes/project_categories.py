"""Project-scoped category routes."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from marshmallow import ValidationError

from app.models.user import User
from app.schemas.category import CategorySchema
from app.services import category_service

bp = Blueprint("project_categories", __name__, url_prefix="/api/projects/<int:project_id>/categories")
schema      = CategorySchema()
schema_many = CategorySchema(many=True)


def _user():
    verify_jwt_in_request()
    return User.query.get_or_404(int(get_jwt_identity()))


@bp.get("")
def list_categories(project_id):
    return jsonify(schema_many.dump(category_service.list_categories(project_id, _user())))


@bp.post("")
def create_category(project_id):
    user = _user()
    try:
        data = schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    return jsonify(schema.dump(category_service.create_category(project_id, data, user))), 201


@bp.get("/<int:category_id>")
def get_category(project_id, category_id):
    return jsonify(schema.dump(category_service.get_category(project_id, category_id, _user())))


@bp.put("/<int:category_id>")
def update_category(project_id, category_id):
    user = _user()
    try:
        data = schema.load(request.get_json() or {}, partial=True)
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    return jsonify(schema.dump(category_service.update_category(project_id, category_id, data, user)))


@bp.delete("/<int:category_id>")
def delete_category(project_id, category_id):
    category_service.delete_category(project_id, category_id, _user())
    return "", 204
