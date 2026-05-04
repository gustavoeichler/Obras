"""Unified project timeline."""
from __future__ import annotations

from datetime import datetime, time, timezone

from flask import Blueprint, jsonify, request

from app.middleware.auth import authorize_project_access
from app.services import timeline_service

bp = Blueprint("project_timeline", __name__)


def _parse_dt(value: str | None, *, end_of_day: bool = False) -> datetime | None:
    """Accepts ISO datetime or YYYY-MM-DD. Returns UTC-aware datetime."""
    if not value:
        return None
    try:
        if "T" in value:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        else:
            d = datetime.strptime(value, "%Y-%m-%d").date()
            dt = datetime.combine(d, time(23, 59, 59) if end_of_day else time(0, 0))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


@bp.get("/api/projects/<int:project_id>/timeline")
@authorize_project_access
def timeline(project_id: int):
    kinds_arg = request.args.get("kinds")
    kinds = tuple(k.strip() for k in kinds_arg.split(",")) if kinds_arg else None

    events = timeline_service.build_timeline(
        project_id,
        kinds     = kinds,
        date_from = _parse_dt(request.args.get("from")),
        date_to   = _parse_dt(request.args.get("to"), end_of_day=True),
        stage_id  = request.args.get("stage_id", type=int),
        q         = request.args.get("q"),
        limit     = request.args.get("limit", default=100, type=int),
        before    = _parse_dt(request.args.get("before")),
    )
    return jsonify(events)
