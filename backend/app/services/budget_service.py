from flask import abort
from sqlalchemy import func

from app.extensions import db
from app.middleware.auth import check_project_access
from app.models.budget import Budget
from app.models.expense import Expense


def _compute_realized(budget: Budget) -> float:
    q = db.session.query(func.sum(Expense.amount)).filter(
        Expense.project_id == budget.project_id
    )
    if budget.category_id:
        q = q.filter(Expense.category_id == budget.category_id)
    if budget.stage_id:
        q = q.filter(Expense.stage_id == budget.stage_id)
    return q.scalar() or 0.0


def _enrich(budget: Budget) -> dict:
    realized  = _compute_realized(budget)
    planned   = budget.planned_amount
    remaining = planned - realized
    percent   = round((realized / planned) * 100, 1) if planned > 0 else 0.0

    if percent > 100:
        status = "estourado"
    elif percent >= 80:
        status = "alerta"
    else:
        status = "ok"

    return {
        "id":              budget.id,
        "project_id":      budget.project_id,
        "planned_amount":  planned,
        "realized_amount": realized,
        "remaining_amount": remaining,
        "percent_used":    percent,
        "status":          status,
        "category_id":     budget.category_id,
        "stage_id":        budget.stage_id,
        "created_at":      budget.created_at,
        "category": {"id": budget.category.id, "name": budget.category.name} if budget.category else None,
        "stage":    {"id": budget.stage.id,    "name": budget.stage.name}    if budget.stage    else None,
    }


def _get_scoped(project_id, budget_id):
    b = Budget.query.get_or_404(budget_id)
    if b.project_id != project_id:
        abort(404)
    return b


def list_budgets(project_id, user):
    check_project_access(project_id, user)
    budgets = Budget.query.filter_by(project_id=project_id).order_by(Budget.created_at.desc()).all()
    return [_enrich(b) for b in budgets]


def get_budget(project_id, budget_id, user):
    check_project_access(project_id, user)
    return _enrich(_get_scoped(project_id, budget_id))


def create_budget(project_id, data, user):
    check_project_access(project_id, user)
    cat_id   = data.get("category_id")
    stage_id = data.get("stage_id")

    existing = Budget.query.filter_by(
        project_id=project_id, category_id=cat_id, stage_id=stage_id
    ).first()
    if existing:
        raise ValueError("Já existe um orçamento para esta combinação de categoria/etapa.")

    budget = Budget(
        project_id=project_id,
        planned_amount=data["planned_amount"],
        category_id=cat_id,
        stage_id=stage_id,
    )
    db.session.add(budget)
    db.session.commit()
    return _enrich(budget)


def update_budget(project_id, budget_id, data, user):
    check_project_access(project_id, user)
    budget = _get_scoped(project_id, budget_id)
    budget.planned_amount = data.get("planned_amount", budget.planned_amount)
    db.session.commit()
    return _enrich(budget)


def delete_budget(project_id, budget_id, user):
    check_project_access(project_id, user)
    budget = _get_scoped(project_id, budget_id)
    db.session.delete(budget)
    db.session.commit()


def list_alerts(project_id, user):
    return [b for b in list_budgets(project_id, user) if b["status"] in ("alerta", "estourado")]
