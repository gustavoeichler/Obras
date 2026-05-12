from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models.user import User
from app.routes.auth import serialize_user
from app.services import org_service

bp = Blueprint("org", __name__, url_prefix="/api/org")


def _current_user():
    return User.query.get_or_404(int(get_jwt_identity()))


def _serialize_member(u):
    return {
        "id":           u.id,
        "email":        u.email,
        "role":         u.role,
        "is_org_admin": u.is_org_admin,
        "created_at":   u.created_at.isoformat() if u.created_at else None,
    }


def _serialize_org(org):
    return {
        "id":         org.id,
        "name":       org.name,
        "is_active":  org.is_active,
        "plan":       org.plan,
        "created_at": org.created_at.isoformat() if org.created_at else None,
    }


@bp.get("/")
@jwt_required()
def get_org():
    user = _current_user()
    org  = org_service.get_org_or_404(user)
    return jsonify({"data": _serialize_org(org)})


@bp.patch("/")
@jwt_required()
def update_org():
    user = _current_user()
    if not user.is_org_admin:
        return jsonify({"error": "Apenas administradores podem atualizar a organização"}), 403
    org  = org_service.get_org_or_404(user)
    data = request.get_json(silent=True) or {}
    org_service.update_org(org, data)
    return jsonify({"data": _serialize_org(org)})


@bp.get("/members")
@jwt_required()
def list_members():
    user    = _current_user()
    if not user.is_org_admin:
        return jsonify({"error": "Apenas administradores podem ver os membros"}), 403
    org     = org_service.get_org_or_404(user)
    members = org_service.list_members(org)
    return jsonify({"data": [_serialize_member(m) for m in members]})


@bp.post("/members")
@jwt_required()
def create_member():
    user = _current_user()
    if not user.is_org_admin:
        return jsonify({"error": "Apenas administradores podem criar membros"}), 403
    org  = org_service.get_org_or_404(user)
    data = request.get_json(silent=True) or {}
    new_user = org_service.create_member(org, data.get("email"), data.get("password"))
    return jsonify({"data": serialize_user(new_user)}), 201


@bp.delete("/members/<int:member_id>")
@jwt_required()
def remove_member(member_id: int):
    user = _current_user()
    if not user.is_org_admin:
        return jsonify({"error": "Apenas administradores podem remover membros"}), 403
    org  = org_service.get_org_or_404(user)
    org_service.remove_member(org, member_id, user)
    return jsonify({"data": {"message": "Membro removido com sucesso"}}), 200
