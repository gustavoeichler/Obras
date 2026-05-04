"""Project-scoped dashboard route."""
from datetime import date
from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.middleware.auth import check_project_access
from app.models.stage import Stage
from app.models.user import User
from app.schemas.expense import ExpenseSchema
from app.services import expense_service, budget_service

bp = Blueprint("project_dashboard", __name__, url_prefix="/api/projects/<int:project_id>/dashboard")
expense_schema_many = ExpenseSchema(many=True)


def _user():
    verify_jwt_in_request()
    return User.query.get_or_404(int(get_jwt_identity()))


@bp.get("")
def dashboard(project_id):
    user = _user()
    check_project_access(project_id, user)

    recent = expense_service.list_expenses(project_id, user)[:5]
    stages = Stage.query.filter_by(project_id=project_id).order_by(Stage.order, Stage.id).all()
    alerts = budget_service.list_alerts(project_id, user)

    today = date.today()
    stages_summary = []
    for s in stages:
        tasks      = s.tasks
        total_t    = len(tasks)
        done_t     = sum(1 for t in tasks if t.is_done)
        progress   = round((done_t / total_t) * 100, 1) if total_t > 0 else 0.0
        is_delayed = bool(
            s.planned_end_date
            and today > s.planned_end_date
            and s.status not in ("Concluída", "concluida")
        )
        stages_summary.append({
            "id":            s.id,
            "name":          s.name,
            "status":        "atrasada" if is_delayed else s.status,
            "is_delayed":    is_delayed,
            "total_expenses": sum(e.amount for e in s.expenses),
            "progress":      progress,
        })

    return jsonify({
        "total_expenses":       expense_service.get_total(project_id),
        "expenses_by_category": expense_service.get_expenses_by_category(project_id),
        "expenses_by_stage":    expense_service.get_expenses_by_stage(project_id),
        "recent_expenses":      expense_schema_many.dump(recent),
        "stages_summary":       stages_summary,
        "budget_alerts":        alerts,
    })
