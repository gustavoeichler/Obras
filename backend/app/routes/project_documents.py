"""Project-scoped document routes."""
import os
from flask import Blueprint, current_app, jsonify, request, send_from_directory
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.models.user import User
from app.schemas.document import DocumentSchema
from app.services import document_service

bp = Blueprint("project_documents", __name__, url_prefix="/api/projects/<int:project_id>/documents")
schema = DocumentSchema()


def _user():
    verify_jwt_in_request()
    return User.query.get_or_404(int(get_jwt_identity()))


def _doc_to_dict(project_id, doc):
    data = schema.dump(doc)
    data["file_url"] = f"/api/projects/{project_id}/documents/{doc.id}/download"
    return data


@bp.get("")
def list_documents(project_id):
    user = _user()
    doc_type = request.args.get("type")
    docs = document_service.list_documents(project_id, user, doc_type)
    return jsonify([_doc_to_dict(project_id, d) for d in docs])


@bp.post("")
def upload_document(project_id):
    user = _user()
    if "file" not in request.files:
        return jsonify({"errors": {"file": ["Arquivo não enviado."]}}), 422

    file     = request.files["file"]
    name     = request.form.get("name", "").strip() or file.filename
    doc_type = request.form.get("type", "other")

    if not file.filename:
        return jsonify({"errors": {"file": ["Nome de arquivo inválido."]}}), 422

    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > 10 * 1024 * 1024:
        return jsonify({"errors": {"file": ["Arquivo excede 10 MB."]}}), 422

    try:
        doc = document_service.save_document(project_id, file, name, doc_type, user)
    except ValueError as err:
        return jsonify({"errors": {"file": [str(err)]}}), 422

    return jsonify(_doc_to_dict(project_id, doc)), 201


@bp.get("/<int:doc_id>/download")
def download(project_id, doc_id):
    user = _user()
    doc    = document_service.get_document(project_id, doc_id, user)
    inline = request.args.get("inline", "0") == "1"
    return send_from_directory(
        current_app.config["UPLOAD_FOLDER"],
        doc.filename,
        download_name=doc.original_filename,
        as_attachment=not inline,
        mimetype=doc.mime_type,
    )


@bp.delete("/<int:doc_id>")
def delete_document(project_id, doc_id):
    document_service.delete_document(project_id, doc_id, _user())
    return "", 204
