from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token

from app.extensions import db
from app.models.user import User

bp = Blueprint("auth", __name__, url_prefix="/auth")

_VALID_ROLES = {"professional", "client"}


@bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}

    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role     = data.get("role") or ""

    if not email or not password or not role:
        return jsonify({"error": "email, password e role são obrigatórios"}), 422

    if role not in _VALID_ROLES:
        return jsonify({"error": f"role deve ser: {', '.join(_VALID_ROLES)}"}), 422

    if len(password) < 6:
        return jsonify({"error": "password deve ter ao menos 6 caracteres"}), 422

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "E-mail já cadastrado"}), 409

    user = User(email=email, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({
        "token": token,
        "user":  {"id": user.id, "email": user.email, "role": user.role},
    }), 201


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}

    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "email e password são obrigatórios"}), 422

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Credenciais inválidas"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({
        "token": token,
        "user":  {"id": user.id, "email": user.email, "role": user.role},
    })
