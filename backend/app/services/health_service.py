"""'Saúde da Obra' — single-screen project health score.

Combines schedule, budget, quality, tasks and approvals into an overall
0-100 score plus a list of human-readable signals.
"""
from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import func

from app.extensions import db
from app.models.daily_report import DailyReport
from app.models.daily_report_occurrence import DailyReportOccurrence
from app.models.expense import Expense
from app.models.project import Project
from app.models.stage import Stage
from app.models.stage_approval import StageApproval
from app.models.task import Task


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))


def _schedule(project_id: int) -> tuple[float, list[str]]:
    stages = Stage.query.filter_by(project_id=project_id).all()
    if not stages:
        return 100.0, []
    today = date.today()
    deviations = []
    overdue = 0
    for s in stages:
        end = s.planned_end_date
        pct = s.completion_pct or 0
        if end and pct < 100:
            if end < today:
                days_late = (today - end).days
                deviations.append(min(40, days_late))
                overdue += 1
    if not deviations:
        return 100.0, []
    avg = sum(deviations) / len(deviations)
    score = _clamp(100 - avg * 2.5)
    signals = []
    if overdue:
        signals.append(f"{overdue} etapa(s) atrasada(s) em relação ao planejado")
    return score, signals


def _budget(project_id: int) -> tuple[float, list[str]]:
    project = Project.query.get(project_id)
    total = float(project.budget_total or 0)
    spent = float(db.session.query(func.coalesce(func.sum(Expense.amount), 0.0))
                  .filter(Expense.project_id == project_id).scalar() or 0)
    if total <= 0:
        return 75.0, []  # neutral when no budget set

    avg_pct = db.session.query(func.coalesce(func.avg(Stage.completion_pct), 0))\
                       .filter(Stage.project_id == project_id).scalar() or 0
    physical = float(avg_pct) / 100.0
    burn     = spent / total
    # If physical=0 and burn=0 → fine. If physical=0 and burn=0.5 → very bad.
    delta_pct = (burn - physical) * 100  # positive = overspending
    score = _clamp(100 - max(0.0, delta_pct) * 2.0)
    signals = []
    if delta_pct > 5:
        signals.append(
            f"Gasto {delta_pct:.0f}% acima do esperado para "
            f"{physical*100:.0f}% de avanço físico"
        )
    elif total and burn >= 0.95 and physical < 0.95:
        signals.append("Orçamento praticamente esgotado antes da conclusão")
    return score, signals


def _quality(project_id: int) -> tuple[float, list[str]]:
    cutoff = date.today() - timedelta(days=14)
    recent = (
        db.session.query(DailyReportOccurrence.kind, func.count())
        .join(DailyReport, DailyReport.id == DailyReportOccurrence.daily_report_id)
        .filter(DailyReport.project_id == project_id)
        .filter(DailyReport.report_date >= cutoff)
        .group_by(DailyReportOccurrence.kind).all()
    )
    weight = {"accident": 25, "rework": 15, "delay": 8, "material_shortage": 6, "weather": 3, "other": 4}
    penalty = 0
    counts  = {}
    for kind, n in recent:
        counts[kind] = n
        penalty += weight.get(kind, 5) * n
    score = _clamp(100 - penalty)
    signals = []
    if counts.get("accident"):
        signals.append(f"{counts['accident']} acidente(s) registrado(s) nos últimos 14 dias")
    if counts.get("rework"):
        signals.append(f"{counts['rework']} retrabalho(s) registrado(s) nos últimos 14 dias")
    return score, signals


def _tasks(project_id: int) -> tuple[float, list[str]]:
    total = Task.query.filter_by(project_id=project_id).count()
    if total == 0:
        return 100.0, []
    open_count = Task.query.filter_by(project_id=project_id, is_done=False).count()
    ratio = open_count / total
    score = _clamp(100 - ratio * 50)
    signals = []
    if open_count >= 5:
        signals.append(f"{open_count} tarefa(s) abertas")
    return score, signals


def _approvals(project_id: int) -> tuple[float, list[str]]:
    cutoff = date.today() - timedelta(days=7)
    pending = (
        db.session.query(StageApproval)
        .join(Stage, Stage.id == StageApproval.stage_id)
        .filter(Stage.project_id == project_id)
        .filter(StageApproval.status == "pending")
        .filter(StageApproval.created_at < cutoff).count()
    )
    score = _clamp(100 - pending * 15)
    signals = []
    if pending:
        signals.append(f"{pending} aprovação(ões) pendente(s) há mais de 7 dias")
    return score, signals


_WEIGHTS = {"schedule": 0.25, "budget": 0.30, "quality": 0.20, "tasks": 0.10, "approvals": 0.15}


def _status(score: float) -> str:
    if score >= 80: return "green"
    if score >= 60: return "yellow"
    return "red"


def project_health(project_id: int) -> dict:
    schedule, sched_sigs = _schedule(project_id)
    budget,   budget_sigs = _budget(project_id)
    quality,  qual_sigs   = _quality(project_id)
    tasks,    task_sigs   = _tasks(project_id)
    approvals, appr_sigs  = _approvals(project_id)

    overall = (
        schedule * _WEIGHTS["schedule"] +
        budget   * _WEIGHTS["budget"]   +
        quality  * _WEIGHTS["quality"]  +
        tasks    * _WEIGHTS["tasks"]    +
        approvals * _WEIGHTS["approvals"]
    )

    return {
        "overall":        round(overall, 1),
        "status":         _status(overall),
        "schedule_score": round(schedule, 1),
        "budget_score":   round(budget, 1),
        "quality_score":  round(quality, 1),
        "tasks_score":    round(tasks, 1),
        "approvals_score": round(approvals, 1),
        "signals":        sched_sigs + budget_sigs + qual_sigs + task_sigs + appr_sigs,
    }
