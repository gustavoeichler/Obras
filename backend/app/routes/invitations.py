import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.invitation import Invitation
from app.models.project import Project
from app.models.project_client import ProjectClient
from app.models.user import User

bp = Blueprint("invitations", __name__)


def _to_dict(inv: Invitation) -> dict:
    return {
        "id":         inv.id,
        "email":      inv.email,
        "project_id": inv.project_id,
        "token":      inv.token,
        "expires_at": inv.expires_at.isoformat(),
        "accepted":   inv.accepted,
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
    }


@bp.post("/api/projects/<int:project_id>/invite")
@jwt_required()
def invite_to_project(project_id: int):
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)
    project = Project.query.get_or_404(project_id)

    if user.role != "professional" or project.professional_id != user_id:
        return jsonify({"error": "Acesso negado"}), 403

    data  = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "email é obrigatório"}), 422

    token      = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    inv = Invitation(
        email      = email,
        project_id = project_id,
        token      = token,
        expires_at = expires_at,
    )
    db.session.add(inv)
    db.session.commit()
    return jsonify(_to_dict(inv)), 201


@bp.get("/api/invite/<string:token>")
def get_invitation(token: str):
    inv     = Invitation.query.filter_by(token=token).first_or_404()
    project = Project.query.get(inv.project_id)
    return jsonify({
        **_to_dict(inv),
        "project_name": project.name if project else None,
    })


@bp.post("/api/invite/<string:token>/accept")
@jwt_required()
def accept_invitation(token: str):
    inv = Invitation.query.filter_by(token=token).first_or_404()

    if inv.accepted:
        return jsonify({"error": "Convite já foi aceito"}), 409

    # Normalise naive datetimes stored in SQLite to UTC
    exp = inv.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > exp:
        return jsonify({"error": "Convite expirado"}), 410

    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)

    if user.role != "client":
        return jsonify({"error": "Apenas clientes podem aceitar convites"}), 403

    existing = ProjectClient.query.filter_by(project_id=inv.project_id, client_id=user_id).first()
    if not existing:
        db.session.add(ProjectClient(project_id=inv.project_id, client_id=user_id))

    inv.accepted = True
    db.session.commit()
    return jsonify({"message": "Convite aceito com sucesso", "project_id": inv.project_id})
