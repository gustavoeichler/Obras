"""Daily Site Reports (RDO — Relatório Diário de Obra)."""
from __future__ import annotations

from datetime import date, datetime, timezone
from io import BytesIO

from flask import Blueprint, abort, jsonify, request, send_file, url_for, render_template
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from marshmallow import ValidationError

from app.extensions import db
from app.middleware.auth import authorize_project_access, check_project_access
from app.models.daily_report import DailyReport
from app.models.daily_report_occurrence import DailyReportOccurrence
from app.models.document import Document
from app.models.project import Project
from app.models.photo import Photo
from app.models.user import User
from app.schemas.daily_report import (
    DailyReportSchema,
    DailyReportOccurrenceSchema,
    DailyReportPhotoSchema,
)
from app.services import pdf_service, share_link_service, weather_service

bp = Blueprint("project_daily_reports", __name__)

report_schema       = DailyReportSchema()
occurrence_schema   = DailyReportOccurrenceSchema()
photo_schema_many   = DailyReportPhotoSchema(many=True)
occurrence_schema_m = DailyReportOccurrenceSchema(many=True)


def _user() -> User:
    verify_jwt_in_request()
    return User.query.get_or_404(int(get_jwt_identity()))


def _serialize_report(rdo: DailyReport) -> dict:
    base = report_schema.dump(rdo)
    base["occurrences"] = occurrence_schema_m.dump(rdo.occurrences or [])
    base["photos"]      = photo_schema_many.dump(rdo.photos or [])
    return base


# ── List / create ────────────────────────────────────────────────────────────

@bp.get("/api/projects/<int:project_id>/daily-reports")
@authorize_project_access
def list_reports(project_id: int):
    q = DailyReport.query.filter_by(project_id=project_id)
    date_from = request.args.get("from")
    date_to   = request.args.get("to")
    if date_from:
        q = q.filter(DailyReport.report_date >= date_from)
    if date_to:
        q = q.filter(DailyReport.report_date <= date_to)
    rdos = q.order_by(DailyReport.report_date.desc()).all()
    return jsonify([_serialize_report(r) for r in rdos])


@bp.post("/api/projects/<int:project_id>/daily-reports")
@authorize_project_access
def create_report(project_id: int):
    try:
        data = report_schema.load(request.get_json() or {"report_date": date.today().isoformat()})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422

    report_date = data["report_date"]

    # Idempotent on (project_id, report_date) — return existing if any.
    existing = DailyReport.query.filter_by(
        project_id=project_id, report_date=report_date,
    ).first()
    if existing:
        return jsonify(_serialize_report(existing)), 200

    project = Project.query.get(project_id)
    summary, temp = weather_service.fetch_weather(project.lat, project.lon, report_date)

    rdo = DailyReport(
        project_id         = project_id,
        report_date        = report_date,
        weather            = data.get("weather")        or summary,
        weather_temp_c     = data.get("weather_temp_c") if data.get("weather_temp_c") is not None else temp,
        headcount_json     = data.get("headcount_json"),
        notes              = data.get("notes"),
        created_by_user_id = int(get_jwt_identity()),
    )
    db.session.add(rdo)
    db.session.commit()
    return jsonify(_serialize_report(rdo)), 201


# ── Detail / update / delete ────────────────────────────────────────────────

def _get_report(project_id: int, rdo_id: int) -> DailyReport:
    rdo = DailyReport.query.get_or_404(rdo_id)
    if rdo.project_id != project_id:
        abort(404)
    return rdo


@bp.get("/api/projects/<int:project_id>/daily-reports/<int:rdo_id>")
@authorize_project_access
def get_report(project_id: int, rdo_id: int):
    return jsonify(_serialize_report(_get_report(project_id, rdo_id)))


@bp.patch("/api/projects/<int:project_id>/daily-reports/<int:rdo_id>")
@authorize_project_access
def update_report(project_id: int, rdo_id: int):
    rdo = _get_report(project_id, rdo_id)
    try:
        data = report_schema.load(request.get_json() or {}, partial=True)
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422

    for f in ("weather", "weather_temp_c", "headcount_json", "notes"):
        if f in data:
            setattr(rdo, f, data[f])
    db.session.commit()
    return jsonify(_serialize_report(rdo))


@bp.delete("/api/projects/<int:project_id>/daily-reports/<int:rdo_id>")
@authorize_project_access
def delete_report(project_id: int, rdo_id: int):
    user = _user()
    rdo  = _get_report(project_id, rdo_id)
    if rdo.created_by_user_id and rdo.created_by_user_id != user.id:
        abort(403, "Apenas o autor pode remover este RDO")
    if rdo.report_date != date.today():
        abort(403, "Só é possível remover o RDO no mesmo dia da criação")
    db.session.delete(rdo)
    db.session.commit()
    return "", 204


# ── Occurrences ──────────────────────────────────────────────────────────────

@bp.post("/api/projects/<int:project_id>/daily-reports/<int:rdo_id>/occurrences")
@authorize_project_access
def add_occurrence(project_id: int, rdo_id: int):
    rdo = _get_report(project_id, rdo_id)
    try:
        data = occurrence_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    occ = DailyReportOccurrence(
        daily_report_id = rdo.id,
        kind            = data["kind"],
        description     = data["description"],
        stage_id        = data.get("stage_id"),
        task_id         = data.get("task_id"),
    )
    db.session.add(occ)
    db.session.commit()
    return jsonify(occurrence_schema.dump(occ)), 201


@bp.delete("/api/projects/<int:project_id>/daily-reports/<int:rdo_id>/occurrences/<int:occ_id>")
@authorize_project_access
def delete_occurrence(project_id: int, rdo_id: int, occ_id: int):
    rdo = _get_report(project_id, rdo_id)
    occ = DailyReportOccurrence.query.get_or_404(occ_id)
    if occ.daily_report_id != rdo.id:
        abort(404)
    db.session.delete(occ)
    db.session.commit()
    return "", 204


# ── PDF generation ───────────────────────────────────────────────────────────

def _render_pdf(rdo: DailyReport) -> tuple[bytes, str]:
    project = Project.query.get(rdo.project_id)
    creator = User.query.get(rdo.created_by_user_id) if rdo.created_by_user_id else None
    return pdf_service.render_pdf(
        "pdf/rdo.html",
        {
            "rdo": rdo,
            "project": project,
            "creator": creator,
            "occurrences": rdo.occurrences,
            "photos": rdo.photos,
            "generated_at": datetime.now(timezone.utc),
        },
    )


@bp.post("/api/projects/<int:project_id>/daily-reports/<int:rdo_id>/generate-pdf")
@authorize_project_access
def generate_pdf(project_id: int, rdo_id: int):
    rdo = _get_report(project_id, rdo_id)
    content, mime = _render_pdf(rdo)

    ext = "pdf" if mime == "application/pdf" else "html"
    filename = f"rdo-{rdo.report_date.isoformat()}-{rdo.id}.{ext}"
    stored   = pdf_service.write_to_uploads(content, project_id, filename)

    if rdo.pdf_document_id:
        doc = Document.query.get(rdo.pdf_document_id)
    else:
        doc = None

    if doc is None:
        doc = Document(
            project_id        = project_id,
            name              = f"RDO {rdo.report_date.isoformat()}",
            type              = "other",
            filename          = stored,
            original_filename = filename,
            file_size         = len(content),
            mime_type         = mime,
        )
        db.session.add(doc)
        db.session.flush()
        rdo.pdf_document_id = doc.id
    else:
        doc.filename          = stored
        doc.original_filename = filename
        doc.file_size         = len(content)
        doc.mime_type         = mime
    db.session.commit()

    return send_file(BytesIO(content), mimetype=mime, download_name=filename, as_attachment=False)


# ── Public share link ───────────────────────────────────────────────────────

@bp.get("/api/projects/<int:project_id>/daily-reports/<int:rdo_id>/share-link")
@authorize_project_access
def share_link(project_id: int, rdo_id: int):
    rdo   = _get_report(project_id, rdo_id)
    token = share_link_service.issue({"pid": project_id, "rid": rdo.id})
    return jsonify({
        "token": token,
        "url": url_for("project_daily_reports.public_rdo", token=token, _external=True),
    })


@bp.get("/api/public/rdo/<token>")
def public_rdo(token: str):
    payload = share_link_service.parse(token)
    if not payload:
        return "<h1>Link inválido ou expirado</h1>", 404
    rdo = DailyReport.query.filter_by(id=payload.get("rid"), project_id=payload.get("pid")).first()
    if not rdo:
        return "<h1>Relatório não encontrado</h1>", 404
    project = Project.query.get(rdo.project_id)
    creator = User.query.get(rdo.created_by_user_id) if rdo.created_by_user_id else None
    return render_template(
        "pdf/rdo.html",
        rdo=rdo, project=project, creator=creator,
        occurrences=rdo.occurrences, photos=rdo.photos,
        generated_at=datetime.now(timezone.utc),
        public_view=True,
    )
