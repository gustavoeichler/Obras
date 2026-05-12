from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.organization import Organization
from app.models.user import User

bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def _require_superadmin():
    """Return current user; abort 403 if not superadmin."""
    user = User.query.get_or_404(int(get_jwt_identity()))
    if not user.is_superadmin:
        from flask import abort
        abort(403, "Acesso restrito a superadministradores")
    return user


def _serialize_org(org, member_count):
    return {
        "id":              org.id,
        "name":            org.name,
        "is_active":       org.is_active,
        "plan":            org.plan,
        "plan_expires_at": org.plan_expires_at.isoformat() if org.plan_expires_at else None,
        "admin_notes":     org.admin_notes,
        "member_count":    member_count,
        "created_at":      org.created_at.isoformat() if org.created_at else None,
    }


@bp.get("/orgs")
@jwt_required()
def list_orgs():
    _require_superadmin()

    orgs = Organization.query.order_by(Organization.created_at.desc()).all()
    member_counts = {
        org_id: count
        for org_id, count in db.session.query(
            User.org_id, db.func.count(User.id)
        ).filter(User.org_id.isnot(None)).group_by(User.org_id).all()
    }

    return jsonify({
        "data": [
            _serialize_org(org, member_counts.get(org.id, 0))
            for org in orgs
        ]
    })


@bp.patch("/orgs/<int:org_id>")
@jwt_required()
def update_org(org_id: int):
    _require_superadmin()

    org  = Organization.query.get_or_404(org_id)
    data = request.get_json(silent=True) or {}

    _UPDATABLE = {"is_active", "plan", "plan_expires_at", "admin_notes"}
    for field in _UPDATABLE:
        if field in data:
            setattr(org, field, data[field])

    db.session.commit()

    member_count = User.query.filter_by(org_id=org.id).count()
    return jsonify({"data": _serialize_org(org, member_count)})
