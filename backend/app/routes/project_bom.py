"""Project-scoped BOM (cotação) routes."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from marshmallow import ValidationError

from app.models.user import User
from app.schemas.bom import BOMQuotationSchema, OptimizeRequestSchema
from app.services import bom_service

bp = Blueprint("project_bom", __name__, url_prefix="/api/projects/<int:project_id>/bom")
schema = BOMQuotationSchema()
optimize_schema = OptimizeRequestSchema()


def _user():
    verify_jwt_in_request()
    return User.query.get_or_404(int(get_jwt_identity()))


@bp.get("")
def list_quotations(project_id):
    user = _user()
    quotations = bom_service.list_quotations(project_id, user)
    # Lightweight summary for the picker; full payload via GET /<id>.
    return jsonify([
        {
            "id":         q.id,
            "name":       q.name,
            "updated_at": q.updated_at.isoformat() if q.updated_at else None,
        }
        for q in quotations
    ])


@bp.post("")
def create_quotation(project_id):
    user = _user()
    try:
        data = schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    q = bom_service.create_quotation(project_id, data, user)
    return jsonify(bom_service.serialize_quotation(q)), 201


@bp.get("/<int:quotation_id>")
def get_quotation(project_id, quotation_id):
    user = _user()
    q = bom_service.get_quotation(project_id, quotation_id, user)
    return jsonify(bom_service.serialize_quotation(q))


@bp.put("/<int:quotation_id>")
def update_quotation(project_id, quotation_id):
    user = _user()
    try:
        data = schema.load(request.get_json() or {}, partial=True)
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    q = bom_service.update_quotation(project_id, quotation_id, data, user)
    return jsonify(bom_service.serialize_quotation(q))


@bp.delete("/<int:quotation_id>")
def delete_quotation(project_id, quotation_id):
    user = _user()
    bom_service.delete_quotation(project_id, quotation_id, user)
    return "", 204


@bp.get("/optimize/methods")
def optimize_methods(project_id):
    from app.middleware.auth import check_project_access
    user = _user()
    check_project_access(project_id, user)
    return jsonify(bom_service.OPTIMIZATION_METHODS)


@bp.post("/optimize")
def optimize(project_id):
    from app.middleware.auth import check_project_access
    user = _user()
    check_project_access(project_id, user)
    try:
        data = optimize_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    result = bom_service.optimize(
        data["products"],
        data["stores"],
        data["prices"],
        methods=data.get("methods") or None,
    )
    return jsonify(result)
