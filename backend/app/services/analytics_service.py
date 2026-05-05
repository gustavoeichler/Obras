from collections import defaultdict
from datetime import date, timedelta

from app.middleware.auth import check_project_access


# ── S-Curve (planned vs actual) ───────────────────────────────────────────────
def s_curve(project_id, user):
    from app.models.expense import Expense
    from app.models.stage import Stage
    from app.models.budget import Budget

    check_project_access(project_id, user)

    expenses = (
        Expense.query
        .filter(Expense.project_id == project_id, Expense.date.isnot(None))
        .order_by(Expense.date)
        .all()
    )

    # Build planned curve from stages with planned dates and attached budgets
    stage_budgets = defaultdict(float)
    for b in Budget.query.filter_by(project_id=project_id).all():
        if b.stage_id:
            stage_budgets[b.stage_id] += b.planned_amount or 0.0

    planned_by_date = defaultdict(float)
    for s in Stage.query.filter_by(project_id=project_id).all():
        amount = stage_budgets.get(s.id, 0.0)
        if amount <= 0 or not s.planned_start_date or not s.planned_end_date:
            continue
        span_days = max((s.planned_end_date - s.planned_start_date).days, 1)
        per_day = amount / span_days
        for i in range(span_days):
            d = s.planned_start_date + timedelta(days=i)
            planned_by_date[str(d)] += per_day

    actual_by_date = defaultdict(float)
    for e in expenses:
        actual_by_date[str(e.date)] += e.amount

    if not actual_by_date and not planned_by_date:
        return []

    all_dates = sorted(set(actual_by_date) | set(planned_by_date))
    result = []
    actual_total = 0.0
    planned_total = 0.0
    for d in all_dates:
        if d in actual_by_date:
            actual_total += actual_by_date[d]
        if d in planned_by_date:
            planned_total += planned_by_date[d]
        row = {"date": d, "value": round(actual_total, 2)}
        if planned_by_date:
            row["planned"] = round(planned_total, 2)
        if actual_by_date:
            row["actual"] = round(actual_total, 2)
        result.append(row)
    return result


# ── Cost per m² ───────────────────────────────────────────────────────────────
def cost_per_m2(project_id, user):
    from app.services.expense_service import get_total

    project = check_project_access(project_id, user)
    if not project.area_m2 or project.area_m2 <= 0:
        return {"error": "area_m2 não configurada"}

    total = get_total(project_id)
    return {
        "total_spent": round(total, 2),
        "area_m2":     project.area_m2,
        "cost_per_m2": round(total / project.area_m2, 2),
    }


# ── Budget deviation ──────────────────────────────────────────────────────────
def budget_deviation(project_id, user):
    from app.services.budget_service import list_budgets
    from app.services.expense_service import get_total

    budgets  = list_budgets(project_id, user)
    planned  = sum(b["planned_amount"] for b in budgets)
    realized = get_total(project_id)

    if planned <= 0:
        return {"error": "Nenhum orçamento cadastrado"}

    deviation = realized - planned
    percent   = round((deviation / planned) * 100, 1)
    return {
        "planned":   round(planned,   2),
        "realized":  round(realized,  2),
        "deviation": round(deviation, 2),
        "percent":   percent,
        "status": "acima" if deviation > 0 else "abaixo" if deviation < 0 else "exato",
    }


# ── Helpers for forecast ──────────────────────────────────────────────────────
def _pct_complete(project_id):
    """Return (pct in 0..1, method) or (None, None) when no completion data."""
    from app.models.stage import Stage
    from app.models.task import Task

    stages = Stage.query.filter_by(project_id=project_id).all()
    if not stages:
        return None, None

    stage_ids = [s.id for s in stages]
    total_tasks = Task.query.filter(Task.stage_id.in_(stage_ids)).count()
    if total_tasks == 0:
        return None, None

    done_tasks = Task.query.filter(Task.stage_id.in_(stage_ids), Task.is_done == True).count()
    pct = done_tasks / total_tasks
    if pct > 0:
        return min(pct, 1.0), "evm"

    return None, None


def _recent_daily(expenses, today, window=30):
    if not expenses:
        return 0.0
    cutoff = today - timedelta(days=window)
    recent = [e for e in expenses if e.date >= cutoff]
    if not recent:
        return 0.0
    span = min(window, max((today - recent[0].date).days, 1))
    return sum(e.amount for e in recent) / span


# ── Forecast (EVM-based with smoothed fallback) ───────────────────────────────
def forecast(project_id, user):
    from app.models.expense import Expense
    from app.models.stage import Stage
    from app.models.budget import Budget

    check_project_access(project_id, user)

    expenses = (
        Expense.query
        .filter(Expense.project_id == project_id, Expense.date.isnot(None))
        .order_by(Expense.date)
        .all()
    )

    bac = sum(
        (b.planned_amount or 0.0)
        for b in Budget.query.filter_by(project_id=project_id).all()
    )

    if not expenses:
        return {
            "current_spent":     0.0,
            "budget_total":      round(bac, 2),
            "pct_complete":      None,
            "pct_time_elapsed":  0.0,
            "method":            "none",
            "confidence":        "very_low",
            "forecast_final":    0.0,
            "vac":               None,
            "cpi":               None,
            "spi":               None,
            "recent_daily_spend": 0.0,
            "avg_daily_spend":    0.0,
            "days_elapsed":      0,
            "days_total":        0,
            "warning":           "sem gastos cadastrados",
        }

    ac = sum(e.amount for e in expenses)
    first_date = expenses[0].date
    today = date.today()
    days_elapsed = max((today - first_date).days, 1)
    avg_daily = ac / days_elapsed
    recent_daily = _recent_daily(expenses, today)

    stages_with_end = [
        s for s in Stage.query.filter_by(project_id=project_id).all()
        if s.planned_end_date is not None
    ]
    if stages_with_end:
        max_end = max(s.planned_end_date for s in stages_with_end)
        days_total = max((max_end - first_date).days, days_elapsed)
    else:
        days_total = max(days_elapsed * 2, days_elapsed)

    days_remaining = max(days_total - days_elapsed, 0)
    pct_time = min(days_elapsed / days_total, 1.0) if days_total > 0 else 1.0

    pct_complete, method = _pct_complete(project_id)

    cpi = spi = vac = None
    warning = None

    if pct_complete and pct_complete > 0:
        # EVM-based EAC
        eac = ac / pct_complete
        if bac > 0:
            ev = bac * pct_complete
            cpi = ev / ac if ac > 0 else None
            pv = bac * pct_time
            spi = ev / pv if pv > 0 else None
            vac = bac - eac
            confidence = "high" if pct_complete >= 0.2 else "medium"
        else:
            confidence = "medium"
            warning = "sem orçamento cadastrado — CPI/SPI indisponíveis"
        forecast_final = eac
    else:
        # Time-smoothed fallback
        method = "time_smoothed"
        forecast_smoothed = ac + recent_daily * days_remaining
        if bac <= 0:
            cap = max(3 * ac, ac + recent_daily * days_remaining)
            forecast_final = min(forecast_smoothed, cap)
            confidence = "very_low"
            warning = "sem orçamento cadastrado — estimativa fraca"
        else:
            forecast_final = forecast_smoothed
            confidence = "low"
            warning = "sem progresso de etapas — estimativa baseada no ritmo recente"
            vac = bac - forecast_final

    return {
        "current_spent":      round(ac, 2),
        "budget_total":       round(bac, 2),
        "pct_complete":       round(pct_complete, 4) if pct_complete is not None else None,
        "pct_time_elapsed":   round(pct_time, 4),
        "method":             method,
        "confidence":         confidence,
        "forecast_final":     round(forecast_final, 2),
        "vac":                round(vac, 2) if vac is not None else None,
        "cpi":                round(cpi, 3) if cpi is not None else None,
        "spi":                round(spi, 3) if spi is not None else None,
        "recent_daily_spend": round(recent_daily, 2),
        "avg_daily_spend":    round(avg_daily, 2),
        "days_elapsed":       days_elapsed,
        "days_total":         days_total,
        "warning":            warning,
    }
