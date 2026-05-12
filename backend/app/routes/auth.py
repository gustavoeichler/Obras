from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from app.extensions import db
from app.models.user import User

bp = Blueprint("auth", __name__, url_prefix="/auth")

_VALID_ROLES = {"professional", "client"}

DEFAULT_BRAND_NAME    = "OBRAS"
DEFAULT_BRAND_COLOR   = "#d4a017"
DEFAULT_BRAND_THEME   = "dark"
_VALID_THEMES         = {"light", "dark"}


def serialize_user(user: User) -> dict:
    """Public user payload — includes resolved branding for the frontend."""
    has_logo = bool(user.logo_path)
    branding = {
        "name":          user.brand_name          or DEFAULT_BRAND_NAME,
        "primary_color": user.brand_color_primary or DEFAULT_BRAND_COLOR,
        "default_theme": user.brand_default_theme or DEFAULT_BRAND_THEME,
        "logo_url":      f"/api/me/branding/logo?u={user.id}" if has_logo else None,
    }
    return {
        "id":               user.id,
        "email":            user.email,
        "role":             user.role,
        "theme_preference": user.theme_preference,
        "branding":         branding,
    }


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
    return jsonify({"token": token, "user": serialize_user(user)}), 201


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
    return jsonify({"token": token, "user": serialize_user(user)})


@bp.get("/me")
@jwt_required()
def me():
    user = User.query.get_or_404(int(get_jwt_identity()))
    return jsonify({"data": serialize_user(user)})
