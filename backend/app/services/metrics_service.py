"""EPIC 4 — Metricas: on-demand cost insights per project."""
from sqlalchemy import func

from app.extensions import db
from app.middleware.auth import check_project_access
from app.models.expense import Expense
from app.models.category import Category


def project_metrics(project_id: int, user) -> dict:
    check_project_access(project_id, user)

    # func.sum returns None when there are no rows — coerce to 0
    total = (
        db.session.query(func.sum(Expense.amount))
        .filter(Expense.project_id == project_id)
        .scalar()
    ) or 0.0

    count = Expense.query.filter_by(project_id=project_id).count()

    return {
        "total_spent":     round(total, 2),
        "expenses_count":  count,
    }


def grouped_by_category(project_id: int, user) -> list:
    check_project_access(project_id, user)

    rows = (
        db.session.query(
            Category.name,
            func.sum(Expense.amount),
        )
        .join(Expense, Expense.category_id == Category.id)
        .filter(Expense.project_id == project_id)
        .group_by(Category.name)
        .all()
    )

    return [
        {"category": name, "total": round(total, 2)}
        for name, total in rows
    ]
