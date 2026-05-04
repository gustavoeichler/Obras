import os
import uuid
from flask import abort, current_app
from werkzeug.utils import secure_filename

from app.extensions import db
from app.middleware.auth import check_project_access
from app.models.document import Document

ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png"}

_MAGIC = {
    b"%PDF":             "application/pdf",
    b"\xff\xd8":         "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
}
ALLOWED_MIMES = set(_MAGIC.values())


def _detect_mime(data: bytes):
    for magic, mime in _MAGIC.items():
        if data[: len(magic)] == magic:
            return mime
    return None


def _ext_ok(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[-1].lower() in ALLOWED_EXTENSIONS


def _get_scoped(project_id, doc_id):
    doc = Document.query.get_or_404(doc_id)
    if doc.project_id != project_id:
        abort(404)
    return doc


def save_document(project_id, file, name, doc_type, user):
    check_project_access(project_id, user)
    if not _ext_ok(file.filename):
        raise ValueError(f"Extensão não permitida. Use: {', '.join(ALLOWED_EXTENSIONS)}")

    header = file.read(16)
    file.seek(0)
    mime = _detect_mime(header)
    if mime not in ALLOWED_MIMES:
        raise ValueError("Tipo de arquivo não permitido ou conteúdo inválido.")

    safe_orig = secure_filename(file.filename)
    stored    = f"{uuid.uuid4().hex}_{safe_orig}"
    dest      = os.path.join(current_app.config["UPLOAD_FOLDER"], stored)

    file.save(dest)
    size = os.path.getsize(dest)

    doc = Document(
        project_id=project_id,
        name=name,
        type=doc_type,
        filename=stored,
        original_filename=safe_orig,
        file_size=size,
        mime_type=mime,
    )
    db.session.add(doc)
    db.session.commit()
    return doc


def list_documents(project_id, user, doc_type=None):
    check_project_access(project_id, user)
    q = Document.query.filter_by(project_id=project_id).order_by(Document.uploaded_at.desc())
    if doc_type:
        q = q.filter_by(type=doc_type)
    return q.all()


def get_document(project_id, doc_id, user):
    check_project_access(project_id, user)
    return _get_scoped(project_id, doc_id)


def delete_document(project_id, doc_id, user):
    doc  = get_document(project_id, doc_id, user)
    path = os.path.join(current_app.config["UPLOAD_FOLDER"], doc.filename)
    if os.path.exists(path):
        os.remove(path)
    db.session.delete(doc)
    db.session.commit()
