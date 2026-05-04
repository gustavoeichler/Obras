from datetime import date

from flask import abort

from app.extensions import db
from app.middleware.auth import check_project_access
from app.models.stage import Stage
from app.models.task import Task


def calculate_progress(stage_id: int) -> int:
    total = Task.query.filter_by(stage_id=stage_id).count()
    if total == 0:
        return 0
    done = Task.query.filter_by(stage_id=stage_id, is_done=True).count()
    return int((done / total) * 100)


def _stage_to_dict(stage: Stage) -> dict:
    today = date.today()
    is_delayed = bool(
        stage.planned_end_date
        and today > stage.planned_end_date
        and stage.status != "concluida"
    )
    total = Task.query.filter_by(stage_id=stage.id).count()
    done = (
        Task.query.filter_by(stage_id=stage.id, is_done=True).count()
        if total else 0
    )
    progress = int((done / total) * 100) if total else 0
    return {
        "id":                stage.id,
        "project_id":        stage.project_id,
        "name":              stage.name,
        "status":            stage.status,
        "planned_start_date": (
            stage.planned_start_date.isoformat()
            if stage.planned_start_date else None
        ),
        "planned_end_date": (
            stage.planned_end_date.isoformat()
            if stage.planned_end_date else None
        ),
        "is_delayed":      is_delayed,
        "progress":        progress,
        "total_tasks":     total,
        "done_tasks":      done,
        "order":           stage.order,
        "parent_stage_id": stage.parent_stage_id,
        "is_locked":       bool(stage.is_locked),
        "completion_pct":  stage.completion_pct or 0,
    }


def create_project_stage(project_id: int, data: dict, user) -> Stage:
    if user.role != "professional":
        abort(403, "Apenas profissionais podem criar etapas")

    check_project_access(project_id, user)

    planned_start = data.get("planned_start_date")
    planned_end   = data.get("planned_end_date")
    if planned_start and planned_end and planned_end < planned_start:
        abort(422, "Data de fim não pode ser anterior à data de início")

    stage = Stage(
        project_id=project_id,
        name=data["name"],
        status=data.get("status", "nao_iniciada"),
        planned_start_date=planned_start,
        planned_end_date=planned_end,
    )
    db.session.add(stage)
    db.session.commit()
    return stage


def list_project_stages(project_id: int, user) -> list:
    check_project_access(project_id, user)
    stages = Stage.query.filter_by(project_id=project_id).order_by(Stage.id).all()
    return [_stage_to_dict(s) for s in stages]


def update_stage(stage_id: int, data: dict, user) -> Stage:
    """General stage update: name, status, planned/real dates."""
    stage = Stage.query.get_or_404(stage_id)

    if user.role != "professional":
        abort(403, "Apenas profissionais podem editar etapas")

    check_project_access(stage.project_id, user)

    for field in ("name", "status", "planned_start_date", "planned_end_date",
                  "start_date", "end_date"):
        if field in data:
            setattr(stage, field, data[field])

    db.session.commit()
    return stage


def delete_stage(stage_id: int, user) -> None:
    stage = Stage.query.get_or_404(stage_id)
    if user.role != "professional":
        abort(403, "Apenas profissionais podem remover etapas")
    check_project_access(stage.project_id, user)
    db.session.delete(stage)
    db.session.commit()


def update_stage_status(stage_id: int, data: dict, user) -> Stage:
    stage = Stage.query.get_or_404(stage_id)

    if user.role != "professional":
        abort(403, "Apenas profissionais podem alterar o status de etapas")

    check_project_access(stage.project_id, user)

    stage.status = data["status"]
    db.session.commit()
    return stage


# ── Workflow ──────────────────────────────────────────────────────────────────

def order_project_stages(project_id: int, stage_ids_ordered: list, user) -> list:
    if user.role != "professional":
        abort(403, "Apenas profissionais podem reordenar etapas")

    check_project_access(project_id, user)

    stages = Stage.query.filter(
        Stage.id.in_(stage_ids_ordered),
        Stage.project_id == project_id
    ).all()

    if len(stages) != len(stage_ids_ordered):
        abort(422, "Uma ou mais etapas não pertencem a este projeto")

    for idx, stage_id in enumerate(stage_ids_ordered):
        stage = Stage.query.get(stage_id)
        stage.order = idx + 1

    db.session.commit()

    ordered_stages = Stage.query.filter_by(project_id=project_id).order_by(Stage.order).all()
    return [_stage_to_dict(s) for s in ordered_stages]


def lock_stage(stage_id: int, user) -> Stage:
    stage = Stage.query.get_or_404(stage_id)
    if user.role != "professional":
        abort(403, "Apenas profissionais podem bloquear etapas")
    check_project_access(stage.project_id, user)
    stage.is_locked = True
    db.session.commit()
    return stage


def unlock_stage(stage_id: int, user) -> Stage:
    stage = Stage.query.get_or_404(stage_id)
    if user.role != "professional":
        abort(403, "Apenas profissionais podem desbloquear etapas")
    check_project_access(stage.project_id, user)
    stage.is_locked = False
    db.session.commit()
    return stage


def get_stage_workflow(stage_id: int) -> dict:
    from app.services.checklist_service import ChecklistService
    from app.services.approval_service import ApprovalService
    from app.models.budget import Budget

    stage = Stage.query.get_or_404(stage_id)

    checklists = ChecklistService.get_stage_items(stage_id)
    approvals = ApprovalService.get_stage_approvals(stage_id)
    can_complete, blockers = ApprovalService.can_complete_stage(stage_id)

    budgets = Budget.query.filter_by(stage_id=stage_id).all()
    budget_data = [
        {
            'id': b.id,
            'category_id': b.category_id,
            'planned_amount': b.planned_amount,
            'payment_milestone_pct': b.payment_milestone_pct,
        }
        for b in budgets
    ]

    return {
        **_stage_to_dict(stage),
        'checklists': checklists,
        'approvals': approvals,
        'can_complete': can_complete,
        'completion_blockers': blockers,
        'budgets': budget_data,
    }
