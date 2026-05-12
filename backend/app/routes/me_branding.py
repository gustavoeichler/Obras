import os
import re

from flask import Blueprint, abort, current_app, jsonify, request, send_from_directory
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models.user import User
from app.routes.auth import _VALID_THEMES, serialize_user

bp = Blueprint("me_branding", __name__, url_prefix="/api/me")

_LOGO_ALLOWED_EXT  = {"png", "jpg", "jpeg", "webp", "svg"}
_LOGO_MAX_BYTES    = 2 * 1024 * 1024  # 2 MB
_HEX_COLOR_RE      = re.compile(r"^#[0-9a-fA-F]{6}$")
_BRAND_NAME_MAX    = 80
_LOGO_MAGIC = {
    b"\x89PNG\r\n\x1a\n": "png",
    b"\xff\xd8":           "jpg",
    b"RIFF":               "webp",
    b"<svg":               "svg",
    b"<?xml":              "svg",
}


def _current_user() -> User:
    return User.query.get_or_404(int(get_jwt_identity()))


def _detect_logo_ext(header: bytes) -> str | None:
    for magic, ext in _LOGO_MAGIC.items():
        if header[: len(magic)] == magic:
            return ext
    return None


def _branding_dir(user_id: int) -> str:
    return os.path.join(current_app.config["UPLOAD_FOLDER"], "branding", str(user_id))


@bp.put("/branding")
@jwt_required()
def update_branding():
    user = _current_user()
    data = request.get_json(silent=True) or {}

    if "name" in data:
        name = (data.get("name") or "").strip()
        if name and len(name) > _BRAND_NAME_MAX:
            return jsonify({"error": f"name deve ter no máximo {_BRAND_NAME_MAX} caracteres"}), 422
        user.brand_name = name or None

    if "primary_color" in data:
        color = (data.get("primary_color") or "").strip()
        if color and not _HEX_COLOR_RE.match(color):
            return jsonify({"error": "primary_color deve ser um hex no formato #RRGGBB"}), 422
        user.brand_color_primary = color or None

    if "default_theme" in data:
        theme = data.get("default_theme")
        if theme not in (None, "") and theme not in _VALID_THEMES:
            return jsonify({"error": f"default_theme deve ser: {', '.join(_VALID_THEMES)}"}), 422
        user.brand_default_theme = theme or None

    db.session.commit()
    return jsonify({"data": serialize_user(user)})


@bp.post("/branding/logo")
@jwt_required()
def upload_logo():
    user = _current_user()

    if "file" not in request.files:
        return jsonify({"error": "Envie o arquivo no campo 'file'"}), 400

    file = request.files["file"]
    header = file.read(_LOGO_MAX_BYTES + 1)
    if len(header) > _LOGO_MAX_BYTES:
        return jsonify({"error": "Arquivo excede 2 MB"}), 413

    ext = _detect_logo_ext(header) or (
        file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else None
    )
    if ext not in _LOGO_ALLOWED_EXT:
        return jsonify({"error": f"Formato inválido. Use: {', '.join(sorted(_LOGO_ALLOWED_EXT))}"}), 415

    dir_ = _branding_dir(user.id)
    os.makedirs(dir_, exist_ok=True)
    # Remove previous logo files (any extension) before writing the new one
    for entry in os.listdir(dir_):
        if entry.startswith("logo."):
            try:
                os.remove(os.path.join(dir_, entry))
            except OSError:
                pass

    filename = f"logo.{ext}"
    with open(os.path.join(dir_, filename), "wb") as f:
        f.write(header)

    user.logo_path = os.path.join("branding", str(user.id), filename).replace("\\", "/")
    db.session.commit()
    return jsonify({"data": serialize_user(user)})


@bp.delete("/branding/logo")
@jwt_required()
def delete_logo():
    user = _current_user()
    if user.logo_path:
        full = os.path.join(current_app.config["UPLOAD_FOLDER"], user.logo_path)
        try:
            os.remove(full)
        except OSError:
            pass
    user.logo_path = None
    db.session.commit()
    return jsonify({"data": serialize_user(user)})


@bp.get("/branding/logo")
def get_logo():
    """Public — serves another professional's brand logo by user id query param.

    Used by client users (and the login screen if we ever surface it) to render
    the brand image without a JWT cookie. Falls through to 404 when unset.
    """
    user_id = request.args.get("u", type=int)
    if not user_id:
        abort(400)
    user = User.query.get_or_404(user_id)
    if not user.logo_path:
        abort(404)
    full = os.path.join(current_app.config["UPLOAD_FOLDER"], user.logo_path)
    directory, filename = os.path.split(full)
    return send_from_directory(directory, secure_filename(filename))


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
