"""Anonymized supplier-price benchmark.

Each priced expense (with quantity > 0 and unit set) yields one
SupplierPriceObservation. Aggregate stats are returned only when the
window has enough data from multiple distinct professionals — never
revealing one user's pricing to another.
"""
from __future__ import annotations

import logging
from datetime import date, timedelta
from statistics import mean

from sqlalchemy import func

from app.extensions import db
from app.models.expense import Expense
from app.models.project import Project
from app.models.supplier_price_observation import SupplierPriceObservation

log = logging.getLogger(__name__)

_MIN_OBSERVATIONS    = 5
_MIN_DISTINCT_PROS   = 3


def record_from_expense(expense: Expense) -> None:
    """Upsert a price observation derived from *expense*. Idempotent."""
    if not expense.quantity or expense.quantity <= 0 or not expense.unit:
        return
    if not expense.amount or expense.amount <= 0:
        return

    project = Project.query.get(expense.project_id)
    if not project or not project.professional_id:
        return

    obs = SupplierPriceObservation.query.filter_by(expense_id=expense.id).first()
    unit_price = float(expense.amount) / float(expense.quantity)

    if obs is None:
        obs = SupplierPriceObservation(
            expense_id      = expense.id,
            professional_id = project.professional_id,
            category_id     = expense.category_id,
            supplier_id     = expense.supplier_id,
            unit            = expense.unit,
            unit_price      = unit_price,
            quantity        = expense.quantity,
            region_code     = project.location,
            observed_at     = expense.date,
        )
        db.session.add(obs)
    else:
        obs.category_id = expense.category_id
        obs.supplier_id = expense.supplier_id
        obs.unit        = expense.unit
        obs.unit_price  = unit_price
        obs.quantity    = expense.quantity
        obs.region_code = project.location
        obs.observed_at = expense.date
    db.session.commit()


def remove_for_expense(expense_id: int) -> None:
    obs = SupplierPriceObservation.query.filter_by(expense_id=expense_id).first()
    if obs:
        db.session.delete(obs)
        db.session.commit()


def _percentile(sorted_values: list[float], pct: float) -> float:
    if not sorted_values:
        return 0.0
    if len(sorted_values) == 1:
        return sorted_values[0]
    k = (len(sorted_values) - 1) * pct
    lo = int(k)
    hi = min(lo + 1, len(sorted_values) - 1)
    frac = k - lo
    return sorted_values[lo] * (1 - frac) + sorted_values[hi] * frac


def benchmark(
    *,
    user_id: int,
    category_id: int | None,
    unit: str | None,
    region_code: str | None,
    since_days: int = 365,
) -> dict:
    cutoff = date.today() - timedelta(days=since_days)

    q = (SupplierPriceObservation.query
         .filter(SupplierPriceObservation.observed_at >= cutoff))
    if category_id is not None:
        q = q.filter(SupplierPriceObservation.category_id == category_id)
    if unit:
        q = q.filter(SupplierPriceObservation.unit == unit)
    if region_code:
        q = q.filter(SupplierPriceObservation.region_code == region_code)

    rows         = q.all()
    others       = [r for r in rows if r.professional_id != user_id]
    own          = [r for r in rows if r.professional_id == user_id]
    distinct_pros = len({r.professional_id for r in others})

    personal_avg = mean(r.unit_price for r in own) if own else None

    if len(others) < _MIN_OBSERVATIONS or distinct_pros < _MIN_DISTINCT_PROS:
        return {
            "status":        "insufficient_data",
            "n":             len(others),
            "distinct_pros": distinct_pros,
            "personal_avg":  personal_avg,
        }

    prices = sorted(r.unit_price for r in others)
    return {
        "status":       "ok",
        "n":            len(others),
        "avg":          mean(prices),
        "p25":          _percentile(prices, 0.25),
        "p50":          _percentile(prices, 0.50),
        "p75":          _percentile(prices, 0.75),
        "personal_avg": personal_avg,
    }
