"""Unified project timeline.

Merges photos, RDOs, expenses, documents, occurrences and auto-derived
stage milestones into one chronological event stream.

Each helper returns a list of fully-shaped event dicts; the public
``build_timeline`` merges, filters and slices them.
"""
from __future__ import annotations

from datetime import datetime, time, timezone
from typing import Iterable

from sqlalchemy import or_

from app.models.category import Category
from app.models.daily_report import DailyReport
from app.models.daily_report_occurrence import DailyReportOccurrence
from app.models.document import Document
from app.models.expense import Expense
from app.models.photo import Photo
from app.models.stage import Stage
from app.models.stage_approval import StageApproval
from app.models.supplier import Supplier
from app.models.user import User

ALL_KINDS = ("photo", "rdo", "expense", "document", "occurrence", "stage_milestone")


# ── helpers ─────────────────────────────────────────────────────────────────

def _stage_dict(stage: Stage | None) -> dict | None:
    if not stage:
        return None
    return {"id": stage.id, "name": stage.name}


def _to_aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _matches_q(q: str | None, *fields: str | None) -> bool:
    if not q:
        return True
    needle = q.lower()
    for f in fields:
        if f and needle in f.lower():
            return True
    return False


# ── per-kind builders ───────────────────────────────────────────────────────

def _photo_events(project_id: int, stage_id: int | None, q: str | None) -> list[dict]:
    qry = Photo.query.filter(Photo.project_id == project_id).filter(Photo.filename.isnot(None))
    if stage_id:
        qry = qry.filter(Photo.stage_id == stage_id)
    out = []
    for p in qry.all():
        if not _matches_q(q, p.description, p.original_filename):
            continue
        uploader = User.query.get(p.uploaded_by) if p.uploaded_by else None
        out.append({
            "kind":        "photo",
            "id":          f"photo-{p.id}",
            "occurred_at": _to_aware(p.created_at),
            "stage":       _stage_dict(Stage.query.get(p.stage_id)) if p.stage_id else None,
            "title":       p.description or "Foto",
            "body":        None,
            "payload": {
                "photo_id":           p.id,
                "url":                f"/api/photos/{p.id}/file",
                "description":        p.description,
                "uploaded_by_email":  uploader.email if uploader else None,
            },
        })
    return out


def _rdo_events(project_id: int, stage_id: int | None, q: str | None) -> list[dict]:
    qry = DailyReport.query.filter(DailyReport.project_id == project_id)
    out = []
    for r in qry.all():
        if not _matches_q(q, r.notes, r.weather):
            continue
        out.append({
            "kind":        "rdo",
            "id":          f"rdo-{r.id}",
            "occurred_at": _to_aware(r.created_at),
            "stage":       None,
            "title":       f"RDO de {r.report_date.strftime('%d/%m/%Y')}",
            "body":        (r.notes or None),
            "payload": {
                "rdo_id":            r.id,
                "report_date":       r.report_date.isoformat(),
                "weather":           r.weather,
                "weather_temp_c":    r.weather_temp_c,
                "headcount":         r.headcount_json or [],
                "photo_count":       len(r.photos or []),
                "occurrence_count":  len(r.occurrences or []),
            },
        })
    return out


def _expense_events(project_id: int, stage_id: int | None, q: str | None) -> list[dict]:
    qry = Expense.query.filter(Expense.project_id == project_id)
    if stage_id:
        qry = qry.filter(Expense.stage_id == stage_id)
    out = []
    for e in qry.all():
        if not _matches_q(q, e.description):
            continue
        supplier  = Supplier.query.get(e.supplier_id) if e.supplier_id else None
        category  = Category.query.get(e.category_id) if e.category_id else None
        # Expenses store only a date — anchor at noon UTC for a stable timestamp.
        occurred = datetime.combine(e.date, time(12, 0), tzinfo=timezone.utc)
        out.append({
            "kind":        "expense",
            "id":          f"expense-{e.id}",
            "occurred_at": occurred,
            "stage":       _stage_dict(Stage.query.get(e.stage_id)) if e.stage_id else None,
            "title":       e.description or "Despesa",
            "body":        None,
            "payload": {
                "expense_id":     e.id,
                "amount":         float(e.amount or 0),
                "supplier_name":  supplier.name if supplier else None,
                "category_name":  category.name if category else None,
                "description":    e.description,
                "quantity":       e.quantity,
                "unit":           e.unit,
            },
        })
    return out


def _document_events(project_id: int, stage_id: int | None, q: str | None) -> list[dict]:
    if stage_id:
        # Documents aren't stage-scoped — exclude when filtering by stage.
        return []
    qry = Document.query.filter(Document.project_id == project_id)
    out = []
    for d in qry.all():
        if not _matches_q(q, d.name, d.original_filename):
            continue
        out.append({
            "kind":        "document",
            "id":          f"document-{d.id}",
            "occurred_at": _to_aware(d.uploaded_at),
            "stage":       None,
            "title":       d.name,
            "body":        None,
            "payload": {
                "document_id":       d.id,
                "name":              d.name,
                "original_filename": d.original_filename,
                "mime_type":         d.mime_type,
                "size":              d.file_size,
                "download_url":      f"/api/projects/{project_id}/documents/{d.id}/download",
                "inline_url":        f"/api/projects/{project_id}/documents/{d.id}/download?inline=1",
            },
        })
    return out


def _occurrence_events(project_id: int, stage_id: int | None, q: str | None) -> list[dict]:
    rows = (
        DailyReportOccurrence.query
        .join(DailyReport, DailyReport.id == DailyReportOccurrence.daily_report_id)
        .filter(DailyReport.project_id == project_id)
    )
    if stage_id:
        rows = rows.filter(DailyReportOccurrence.stage_id == stage_id)
    out = []
    for o in rows.all():
        if not _matches_q(q, o.description):
            continue
        rdo = DailyReport.query.get(o.daily_report_id)
        out.append({
            "kind":        "occurrence",
            "id":          f"occurrence-{o.id}",
            "occurred_at": _to_aware(o.created_at),
            "stage":       _stage_dict(Stage.query.get(o.stage_id)) if o.stage_id else None,
            "title":       o.description[:80],
            "body":        o.description if len(o.description) > 80 else None,
            "payload": {
                "occurrence_id": o.id,
                "kind":          o.kind,
                "rdo_id":        rdo.id if rdo else None,
                "rdo_date":      rdo.report_date.isoformat() if rdo else None,
            },
        })
    return out


def _stage_milestone_events(project_id: int, stage_id: int | None, q: str | None) -> list[dict]:
    qry = Stage.query.filter(Stage.project_id == project_id)
    if stage_id:
        qry = qry.filter(Stage.id == stage_id)
    out = []
    for s in qry.all():
        if not _matches_q(q, s.name):
            # Allow milestones through when q is empty; otherwise filter on stage name.
            if q:
                continue

        # started — prefer planned/start date, else earliest related photo.
        started_at = None
        if s.start_date:
            started_at = datetime.combine(s.start_date, time(8, 0), tzinfo=timezone.utc)
        else:
            first_photo = (
                Photo.query.filter_by(project_id=project_id, stage_id=s.id)
                .filter(Photo.created_at.isnot(None))
                .order_by(Photo.created_at.asc()).first()
            )
            if first_photo:
                started_at = _to_aware(first_photo.created_at)
        if started_at:
            out.append({
                "kind":        "stage_milestone",
                "id":          f"stage_milestone-started-{s.id}",
                "occurred_at": started_at,
                "stage":       _stage_dict(s),
                "title":       f"Etapa “{s.name}” iniciada",
                "body":        None,
                "payload":     {"stage_id": s.id, "milestone": "started"},
            })

        # finished
        if s.status == "concluida" and s.end_date:
            out.append({
                "kind":        "stage_milestone",
                "id":          f"stage_milestone-finished-{s.id}",
                "occurred_at": datetime.combine(s.end_date, time(18, 0), tzinfo=timezone.utc),
                "stage":       _stage_dict(s),
                "title":       f"Etapa “{s.name}” concluída",
                "body":        None,
                "payload":     {"stage_id": s.id, "milestone": "finished"},
            })

        # approved — one event per approved approval
        approvals = StageApproval.query.filter_by(stage_id=s.id, status="approved").all()
        for a in approvals:
            if a.approval_date is None:
                continue
            out.append({
                "kind":        "stage_milestone",
                "id":          f"stage_milestone-approved-{a.id}",
                "occurred_at": _to_aware(a.approval_date),
                "stage":       _stage_dict(s),
                "title":       f"Etapa “{s.name}” aprovada ({a.required_role})",
                "body":        None,
                "payload":     {"stage_id": s.id, "milestone": "approved", "approval_id": a.id},
            })
    return out


_BUILDERS = {
    "photo":           _photo_events,
    "rdo":             _rdo_events,
    "expense":         _expense_events,
    "document":        _document_events,
    "occurrence":      _occurrence_events,
    "stage_milestone": _stage_milestone_events,
}


# ── public ──────────────────────────────────────────────────────────────────

def build_timeline(
    project_id: int,
    *,
    kinds: Iterable[str] | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    stage_id: int | None = None,
    q: str | None = None,
    limit: int = 100,
    before: datetime | None = None,
) -> list[dict]:
    requested = tuple(kinds) if kinds else ALL_KINDS
    requested = tuple(k for k in requested if k in _BUILDERS)

    events: list[dict] = []
    for kind in requested:
        events.extend(_BUILDERS[kind](project_id, stage_id, q))

    if date_from is not None:
        events = [e for e in events if e["occurred_at"] and e["occurred_at"] >= date_from]
    if date_to is not None:
        events = [e for e in events if e["occurred_at"] and e["occurred_at"] <= date_to]
    if before is not None:
        events = [e for e in events if e["occurred_at"] and e["occurred_at"] < before]

    events.sort(key=lambda e: (e["occurred_at"] or datetime.min.replace(tzinfo=timezone.utc),
                               e["id"]), reverse=True)

    if limit and limit > 0:
        events = events[:limit]

    # Serialise datetimes for JSON.
    for e in events:
        if e.get("occurred_at"):
            e["occurred_at"] = e["occurred_at"].isoformat()
    return events
