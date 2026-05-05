import uuid

from flask import Blueprint, current_app, jsonify, redirect, request
from flask_jwt_extended import get_jwt_identity
from werkzeug.utils import secure_filename

from app.extensions import db
from app.middleware.auth import authorize_project_access
from app.models.photo import Photo

bp = Blueprint("photos", __name__)

_ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
_MAGIC = {
    b"\xff\xd8":           "image/jpeg",
    b"\x89PNG\r\n\x1a\n":  "image/png",
    b"RIFF":               "image/webp",
}


def _detect_mime(data: bytes) -> str | None:
    for magic, mime in _MAGIC.items():
        if data[: len(magic)] == magic:
            return mime
    return None


def _ext_ok(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[-1].lower() in _ALLOWED_EXTENSIONS


def _storage():
    client = current_app.supabase
    if client is None:
        raise RuntimeError("Supabase client not configured — set SUPABASE_URL and SUPABASE_SERVICE_KEY")
    return client.storage.from_(current_app.config["SUPABASE_BUCKET"])


def _to_dict(p: Photo) -> dict:
    return {
        "id":          p.id,
        "project_id":  p.project_id,
        "stage_id":    p.stage_id,
        "uploaded_by": p.uploaded_by,
        "description": p.description,
        "type":        p.type,
        "visibility":  p.visibility,
        "url":         f"/api/photos/{p.id}/file" if p.filename else None,
        "created_at":  p.created_at.isoformat() if p.created_at else None,
    }


@bp.post("/api/projects/<int:project_id>/photos")
@authorize_project_access
def upload_photo(project_id: int):
    storage_path = None
    safe_orig    = None

    if "file" in request.files:
        file = request.files["file"]
        if not file.filename or not _ext_ok(file.filename):
            return jsonify({"error": f"Extensão inválida. Use: {', '.join(_ALLOWED_EXTENSIONS)}"}), 422

        data = file.read()
        mime = _detect_mime(data[:16])
        if not mime:
            return jsonify({"error": "Tipo de arquivo inválido"}), 422

        safe_orig    = secure_filename(file.filename)
        storage_path = f"{project_id}/{uuid.uuid4().hex}_{safe_orig}"

        try:
            _storage().upload(
                path=storage_path,
                file=data,
                file_options={"content-type": mime},
            )
        except Exception as exc:
            current_app.logger.error("Supabase upload failed: %s", exc)
            return jsonify({"error": "Falha ao salvar a imagem"}), 500
    else:
        if not (request.form.get("description") or "").strip():
            return jsonify({"error": "Informe uma descrição ou envie uma foto"}), 422

    photo = Photo(
        project_id        = project_id,
        stage_id          = request.form.get("stage_id", type=int),
        uploaded_by       = int(get_jwt_identity()),
        filename          = storage_path,
        original_filename = safe_orig,
        description       = request.form.get("description"),
        type              = request.form.get("type", "progress"),
        visibility        = request.form.get("visibility", "public"),
        daily_report_id   = request.form.get("daily_report_id", type=int),
    )
    db.session.add(photo)
    db.session.commit()
    return jsonify(_to_dict(photo)), 201


@bp.get("/api/photos/<int:photo_id>/file")
def serve_photo(photo_id: int):
    photo = Photo.query.get_or_404(photo_id)
    if not photo.filename:
        return jsonify({"error": "Sem arquivo"}), 404

    try:
        res = _storage().create_signed_url(photo.filename, expires_in=3600)
        # supabase-py v2 returns an object with .signed_url attribute
        signed_url = res.signed_url if hasattr(res, "signed_url") else res["signedURL"]
    except Exception as exc:
        current_app.logger.error("Supabase signed URL failed: %s", exc)
        return jsonify({"error": "Não foi possível gerar o link da imagem"}), 500

    return redirect(signed_url, code=302)


@bp.get("/api/projects/<int:project_id>/feed")
@authorize_project_access
def get_feed(project_id: int):
    photos = (
        Photo.query
        .filter_by(project_id=project_id)
        .order_by(Photo.created_at.desc())
        .all()
    )
    return jsonify([_to_dict(p) for p in photos])
