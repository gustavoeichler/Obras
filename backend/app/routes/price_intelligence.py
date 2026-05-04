"""Anonymized supplier-price benchmark endpoints."""
from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.middleware.auth import authorize_project_access, check_project_access
from app.models.expense import Expense
from app.models.project import Project
from app.models.user import User
from app.services import supplier_price_service

bp = Blueprint("price_intelligence", __name__)


def _user() -> User:
    verify_jwt_in_request()
    return User.query.get_or_404(int(get_jwt_identity()))


@bp.get("/api/price-intelligence/benchmark")
def benchmark():
    user = _user()
    category_id = request.args.get("category_id", type=int)
    unit        = request.args.get("unit")
    region_code = request.args.get("region_code")
    since_days  = request.args.get("since_days", default=365, type=int)
    return jsonify(supplier_price_service.benchmark(
        user_id     = user.id,
        category_id = category_id,
        unit        = unit,
        region_code = region_code,
        since_days  = since_days,
    ))


@bp.get("/api/projects/<int:project_id>/expenses/<int:expense_id>/benchmark")
@authorize_project_access
def expense_benchmark(project_id: int, expense_id: int):
    user = _user()
    expense = Expense.query.get_or_404(expense_id)
    if expense.project_id != project_id:
        return jsonify({"error": "Expense not in project"}), 404
    project = Project.query.get(project_id)

    result = supplier_price_service.benchmark(
        user_id     = user.id,
        category_id = expense.category_id,
        unit        = expense.unit,
        region_code = project.location,
    )

    if result.get("status") == "ok" and expense.quantity and expense.amount:
        unit_price = float(expense.amount) / float(expense.quantity)
        result["your_unit_price"] = unit_price
        if result.get("avg"):
            result["delta_pct"] = (unit_price - result["avg"]) / result["avg"] * 100
    return jsonify(result)


@bp.get("/api/price-intelligence/overview")
def overview():
    """Top categories where the user's avg is high vs. peer median.

    Returns a ranked list of {category_id, category_name, your_avg,
    peer_median, delta_pct, n} entries. Only includes categories with
    enough data to show a benchmark.
    """
    from app.models.category import Category
    from app.models.supplier_price_observation import SupplierPriceObservation

    user = _user()

    own_obs = (SupplierPriceObservation.query
               .filter(SupplierPriceObservation.professional_id == user.id)
               .all())

    by_cat: dict = {}
    for o in own_obs:
        if not o.category_id:
            continue
        by_cat.setdefault(o.category_id, []).append(o.unit_price)

    items = []
    for cat_id, prices in by_cat.items():
        cat = Category.query.get(cat_id)
        if not cat:
            continue
        result = supplier_price_service.benchmark(
            user_id=user.id, category_id=cat_id, unit=None, region_code=None,
        )
        if result.get("status") != "ok":
            continue
        own_avg = sum(prices) / len(prices)
        items.append({
            "category_id":   cat_id,
            "category_name": cat.name,
            "your_avg":      own_avg,
            "peer_median":   result["p50"],
            "delta_pct":     (own_avg - result["p50"]) / result["p50"] * 100 if result["p50"] else 0,
            "n":             result["n"],
        })

    items.sort(key=lambda x: x["delta_pct"], reverse=True)
    return jsonify(items)
