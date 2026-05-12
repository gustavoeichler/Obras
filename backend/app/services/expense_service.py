from flask import abort
from sqlalchemy import func

from app.extensions import db
from app.middleware.auth import check_project_access
from app.models.expense import Expense


def list_expenses(project_id, user, category_id=None, stage_id=None, supplier_id=None):
    check_project_access(project_id, user)
    query = Expense.query.filter_by(project_id=project_id)
    if category_id:
        query = query.filter_by(category_id=category_id)
    if stage_id:
        query = query.filter_by(stage_id=stage_id)
    if supplier_id:
        query = query.filter_by(supplier_id=supplier_id)
    return query.order_by(Expense.date.desc()).all()


def get_expense(project_id, expense_id, user):
    check_project_access(project_id, user)
    expense = Expense.query.get_or_404(expense_id)
    if expense.project_id != project_id:
        from flask import abort
        abort(404)
    return expense


def _assert_member(project_id, responsible_user_id):
    """Ensure responsible_user_id belongs to this project (owner or invited client)."""
    if responsible_user_id is None:
        return
    from app.models.project import Project
    from app.models.project_client import ProjectClient
    project = Project.query.get_or_404(project_id)
    is_owner  = project.professional_id == responsible_user_id
    is_client = ProjectClient.query.filter_by(
        project_id=project_id, client_id=responsible_user_id
    ).first() is not None
    if not is_owner and not is_client:
        abort(400, description="responsible_user_id não pertence a este projeto")


def create_expense(project_id, data, user):
    check_project_access(project_id, user)
    responsible_user_id = data.get("responsible_user_id")
    _assert_member(project_id, responsible_user_id)
    expense = Expense(
        project_id=project_id,
        amount=data["amount"],
        date=data["date"],
        description=data.get("description"),
        category_id=data.get("category_id"),
        stage_id=data.get("stage_id"),
        supplier_id=data.get("supplier_id"),
        quantity=data.get("quantity"),
        unit=data.get("unit"),
        responsible_user_id=responsible_user_id,
    )
    db.session.add(expense)
    db.session.commit()
    _record_price_observation(expense)
    return expense


def update_expense(project_id, expense_id, data, user):
    expense = get_expense(project_id, expense_id, user)
    if "responsible_user_id" in data:
        _assert_member(project_id, data["responsible_user_id"])
        expense.responsible_user_id = data["responsible_user_id"]
    expense.amount      = data.get("amount",      expense.amount)
    expense.date        = data.get("date",        expense.date)
    expense.description = data.get("description", expense.description)
    expense.category_id = data.get("category_id", expense.category_id)
    expense.stage_id    = data.get("stage_id",    expense.stage_id)
    expense.supplier_id = data.get("supplier_id", expense.supplier_id)
    if "quantity" in data:
        expense.quantity = data["quantity"]
    if "unit" in data:
        expense.unit = data["unit"]
    db.session.commit()
    _record_price_observation(expense)
    return expense


def delete_expense(project_id, expense_id, user):
    expense = get_expense(project_id, expense_id, user)
    from app.services import supplier_price_service
    supplier_price_service.remove_for_expense(expense.id)
    db.session.delete(expense)
    db.session.commit()


def _record_price_observation(expense):
    from app.services import supplier_price_service
    try:
        supplier_price_service.record_from_expense(expense)
    except Exception:
        # Observations are best-effort — never fail the expense write.
        import logging
        logging.getLogger(__name__).warning("price observation failed", exc_info=True)


def get_total(project_id):
    result = db.session.query(func.sum(Expense.amount)).filter(
        Expense.project_id == project_id
    ).scalar()
    return result or 0.0


def get_expenses_by_category(project_id):
    from app.models.category import Category
    rows = (
        db.session.query(Category.name, func.sum(Expense.amount))
        .join(Expense, Expense.category_id == Category.id)
        .filter(Expense.project_id == project_id)
        .group_by(Category.id)
        .all()
    )
    return [{"name": name, "total": total} for name, total in rows]


def get_expenses_by_stage(project_id):
    from app.models.stage import Stage
    rows = (
        db.session.query(Stage.name, func.sum(Expense.amount))
        .join(Expense, Expense.stage_id == Stage.id)
        .filter(Expense.project_id == project_id)
        .group_by(Stage.id)
        .all()
    )
    return [{"name": name, "total": total} for name, total in rows]
