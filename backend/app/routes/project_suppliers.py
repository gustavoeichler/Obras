"""Project-scoped supplier routes."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from marshmallow import ValidationError

from app.models.user import User
from app.schemas.supplier import SupplierSchema
from app.services import supplier_service

bp = Blueprint("project_suppliers", __name__, url_prefix="/api/projects/<int:project_id>/suppliers")
schema      = SupplierSchema()
schema_many = SupplierSchema(many=True)


def _user():
    verify_jwt_in_request()
    return User.query.get_or_404(int(get_jwt_identity()))


@bp.get("")
def list_suppliers(project_id):
    return jsonify(schema_many.dump(supplier_service.list_suppliers(project_id, _user())))


@bp.post("")
def create_supplier(project_id):
    user = _user()
    try:
        data = schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    return jsonify(schema.dump(supplier_service.create_supplier(project_id, data, user))), 201


@bp.get("/<int:supplier_id>")
def get_supplier(project_id, supplier_id):
    return jsonify(schema.dump(supplier_service.get_supplier(project_id, supplier_id, _user())))


@bp.put("/<int:supplier_id>")
def update_supplier(project_id, supplier_id):
    user = _user()
    try:
        data = schema.load(request.get_json() or {}, partial=True)
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    return jsonify(schema.dump(supplier_service.update_supplier(project_id, supplier_id, data, user)))


@bp.delete("/<int:supplier_id>")
def delete_supplier(project_id, supplier_id):
    supplier_service.delete_supplier(project_id, supplier_id, _user())
    return "", 204
