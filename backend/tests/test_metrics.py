"""
Essential tests for EPIC 4 — Métricas.

Run from the repo root:
    uv run pytest backend/tests/test_metrics.py -v
"""
import pytest

from app import create_app
from app.extensions import db as _db
from app.models.user import User
from app.models.project import Project
from app.models.project_client import ProjectClient
from app.models.category import Category
from app.models.expense import Expense
from app.services.metrics_service import project_metrics, grouped_by_category
import datetime


# ── fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def app():
    app = create_app()
    app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
        JWT_SECRET_KEY="test-secret",
    )
    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture(scope="module")
def http(app):
    return app.test_client()


@pytest.fixture(scope="module")
def seeded(app):
    from flask_jwt_extended import create_access_token

    with app.app_context():
        pro = User(email="pro@metrics.com", role="professional")
        pro.set_password("s")
        cli = User(email="cli@metrics.com", role="client")
        cli.set_password("s")
        other_pro = User(email="other@metrics.com", role="professional")
        other_pro.set_password("s")
        _db.session.add_all([pro, cli, other_pro])
        _db.session.flush()

        project = Project(name="Metrics Project", professional_id=pro.id, status="active")
        other_project = Project(name="Other Project", professional_id=other_pro.id, status="active")
        _db.session.add_all([project, other_project])
        _db.session.flush()

        _db.session.add(ProjectClient(project_id=project.id, client_id=cli.id))

        cat_a = Category(name="Materiais")
        cat_b = Category(name="Mão de obra")
        _db.session.add_all([cat_a, cat_b])
        _db.session.flush()

        today = datetime.date.today()
        expenses = [
            Expense(project_id=project.id, category_id=cat_a.id, amount=1000.0, date=today),
            Expense(project_id=project.id, category_id=cat_a.id, amount=500.0,  date=today),
            Expense(project_id=project.id, category_id=cat_b.id, amount=2000.0, date=today),
            # expense belonging to other project — must NOT appear in project metrics
            Expense(project_id=other_project.id, category_id=cat_a.id, amount=9999.0, date=today),
        ]
        _db.session.add_all(expenses)
        _db.session.commit()

        return {
            "pro_id":          pro.id,
            "cli_id":          cli.id,
            "other_pro_id":    other_pro.id,
            "project_id":      project.id,
            "other_project_id": other_project.id,
            "pro_token":       create_access_token(identity=str(pro.id)),
            "cli_token":       create_access_token(identity=str(cli.id)),
            "other_pro_token": create_access_token(identity=str(other_pro.id)),
        }


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ── project_metrics ───────────────────────────────────────────────────────────

def test_total_spent_correct(app, seeded):
    with app.app_context():
        pro = User.query.get(seeded["pro_id"])
        result = project_metrics(seeded["project_id"], pro)
        assert result["total_spent"] == 3500.0
        assert result["expenses_count"] == 3


def test_total_spent_excludes_other_projects(app, seeded):
    with app.app_context():
        pro = User.query.get(seeded["pro_id"])
        result = project_metrics(seeded["project_id"], pro)
        # the 9999.0 from the other project must not appear
        assert result["total_spent"] == 3500.0


def test_total_spent_empty_project(app, seeded):
    with app.app_context():
        pro = User.query.get(seeded["pro_id"])
        empty = Project(name="Empty", professional_id=pro.id, status="active")
        _db.session.add(empty)
        _db.session.commit()
        result = project_metrics(empty.id, pro)
        assert result["total_spent"] == 0.0
        assert result["expenses_count"] == 0


def test_client_can_view_metrics(app, seeded):
    with app.app_context():
        cli = User.query.get(seeded["cli_id"])
        result = project_metrics(seeded["project_id"], cli)
        assert result["total_spent"] == 3500.0


def test_other_pro_denied(app, seeded):
    from flask import abort
    with app.app_context():
        other = User.query.get(seeded["other_pro_id"])
        with pytest.raises(Exception):  # abort(403)
            project_metrics(seeded["project_id"], other)


# ── grouped_by_category ───────────────────────────────────────────────────────

def test_grouping_correct(app, seeded):
    with app.app_context():
        pro = User.query.get(seeded["pro_id"])
        rows = grouped_by_category(seeded["project_id"], pro)

        by_name = {r["category"]: r["total"] for r in rows}
        assert by_name["Materiais"]   == 1500.0   # 1000 + 500
        assert by_name["Mão de obra"] == 2000.0


def test_grouping_excludes_other_projects(app, seeded):
    with app.app_context():
        pro = User.query.get(seeded["pro_id"])
        rows = grouped_by_category(seeded["project_id"], pro)
        totals = [r["total"] for r in rows]
        assert 9999.0 not in totals


def test_grouping_empty_project(app, seeded):
    with app.app_context():
        pro = User.query.get(seeded["pro_id"])
        empty = Project(name="Empty2", professional_id=pro.id, status="active")
        _db.session.add(empty)
        _db.session.commit()
        rows = grouped_by_category(empty.id, pro)
        assert rows == []


# ── HTTP routes ───────────────────────────────────────────────────────────────

def test_metrics_route_ok(http, seeded):
    resp = http.get(
        f"/api/projects/{seeded['project_id']}/metrics",
        headers=auth(seeded["pro_token"]),
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["total_spent"] == 3500.0
    assert data["expenses_count"] == 3


def test_by_category_route_ok(http, seeded):
    resp = http.get(
        f"/api/projects/{seeded['project_id']}/metrics/by-category",
        headers=auth(seeded["pro_token"]),
    )
    assert resp.status_code == 200
    rows = resp.get_json()
    by_name = {r["category"]: r["total"] for r in rows}
    assert by_name["Materiais"] == 1500.0


def test_metrics_route_unauthorized(http, seeded):
    resp = http.get(f"/api/projects/{seeded['project_id']}/metrics")
    assert resp.status_code == 401


def test_metrics_route_wrong_pro(http, seeded):
    resp = http.get(
        f"/api/projects/{seeded['project_id']}/metrics",
        headers=auth(seeded["other_pro_token"]),
    )
    assert resp.status_code == 403
