import re
import uuid

from flask import Blueprint, Response, abort, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.user import User
from app.routes.auth import _VALID_THEMES, serialize_user

bp = Blueprint("me_branding", __name__, url_prefix="/api/me")

_LOGO_MAX_BYTES = 2 * 1024 * 1024  # 2 MB
_HEX_COLOR_RE   = re.compile(r"^#[0-9a-fA-F]{6}$")
_BRAND_NAME_MAX = 80

_MIME_MAP = {
    b"\x89PNG\r\n\x1a\n": ("image/png",  "png"),
    b"\xff\xd8":          ("image/jpeg", "jpg"),
    b"RIFF":              ("image/webp", "webp"),
}
_ALLOWED_MIMES = {m for m, _ in _MIME_MAP.values()}


def _current_user() -> User:
    return User.query.get_or_404(int(get_jwt_identity()))


def _storage():
    client = current_app.supabase
    if client is None:
        raise RuntimeError("Supabase não configurado — defina SUPABASE_URL e SUPABASE_SERVICE_KEY")
    return client.storage.from_(current_app.config["SUPABASE_BUCKET"])


def _detect(header: bytes):
    """Return (mime, ext) or (None, None)."""
    for magic, (mime, ext) in _MIME_MAP.items():
        if header[: len(magic)] == magic:
            return mime, ext
    return None, None


@bp.put("/branding")
@jwt_required()
def update_branding():
    user = _current_user()
    if not user.is_org_admin:
        return jsonify({"error": "Apenas administradores da organização podem atualizar a marca"}), 403
    org = user.org
    if not org:
        return jsonify({"error": "Usuário sem organização"}), 400
    data = request.get_json(silent=True) or {}

    if "name" in data:
        name = (data.get("name") or "").strip()
        if name and len(name) > _BRAND_NAME_MAX:
            return jsonify({"error": f"name deve ter no máximo {_BRAND_NAME_MAX} caracteres"}), 422
        org.brand_name = name or None

    if "primary_color" in data:
        color = (data.get("primary_color") or "").strip()
        if color and not _HEX_COLOR_RE.match(color):
            return jsonify({"error": "primary_color deve ser um hex no formato #RRGGBB"}), 422
        org.brand_color_primary = color or None

    if "default_theme" in data:
        theme = data.get("default_theme")
        if theme not in (None, "") and theme not in _VALID_THEMES:
            return jsonify({"error": f"default_theme deve ser: {', '.join(_VALID_THEMES)}"}), 422
        org.brand_default_theme = theme or None

    db.session.commit()
    return jsonify({"data": serialize_user(user)})


@bp.post("/branding/logo")
@jwt_required()
def upload_logo():
    user = _current_user()
    if not user.is_org_admin:
        return jsonify({"error": "Apenas administradores da organização podem atualizar o logo"}), 403
    org = user.org
    if not org:
        return jsonify({"error": "Usuário sem organização"}), 400

    if "file" not in request.files:
        return jsonify({"error": "Envie o arquivo no campo 'file'"}), 400

    file = request.files["file"]
    data = file.read(_LOGO_MAX_BYTES + 1)
    if len(data) > _LOGO_MAX_BYTES:
        return jsonify({"error": "Arquivo excede 2 MB"}), 413

    mime, ext = _detect(data[:16])
    if not mime:
        return jsonify({"error": "Formato inválido. Use PNG, JPG ou WebP."}), 415

    if org.logo_path:
        try:
            _storage().remove([org.logo_path])
        except Exception:
            pass  # best-effort

    storage_path = f"branding/org/{org.id}/{uuid.uuid4().hex}.{ext}"
    try:
        _storage().upload(
            path=storage_path,
            file=data,
            file_options={"content-type": mime},
        )
    except Exception as exc:
        current_app.logger.error("Supabase logo upload failed: %s", exc)
        return jsonify({"error": "Falha ao salvar o logo"}), 500

    org.logo_path = storage_path
    db.session.commit()
    return jsonify({"data": serialize_user(user)})


@bp.delete("/branding/logo")
@jwt_required()
def delete_logo():
    user = _current_user()
    if not user.is_org_admin:
        return jsonify({"error": "Apenas administradores da organização podem remover o logo"}), 403
    org = user.org
    if org and org.logo_path:
        try:
            _storage().remove([org.logo_path])
        except Exception:
            pass  # best-effort
        org.logo_path = None
        db.session.commit()
    return jsonify({"data": serialize_user(user)})


@bp.get("/branding/logo")
def get_logo():
    """Public — proxies the brand logo from Supabase by ?u=<user_id>."""
    user_id = request.args.get("u", type=int)
    if not user_id:
        abort(400)
    user = User.query.get_or_404(user_id)
    org = user.org
    if not org or not org.logo_path:
        abort(404)

    try:
        raw = _storage().download(org.logo_path)
    except Exception as exc:
        current_app.logger.error("Supabase logo download failed: %s", exc)
        abort(404)

    mime, _ = _detect(bytes(raw[:16]))
    return Response(raw, mimetype=mime or "image/png")


@bp.put("/theme")
@jwt_required()
def update_theme_preference():
    user = _current_user()
    data = request.get_json(silent=True) or {}
    theme = data.get("theme_preference")
    if theme not in (None, "") and theme not in _VALID_THEMES:
        return jsonify({"error": f"theme_preference deve ser: {', '.join(_VALID_THEMES)}"}), 422
    user.theme_preference = theme or None
    db.session.commit()
    return jsonify({"data": serialize_user(user)})
