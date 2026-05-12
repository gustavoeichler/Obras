"""
Essential tests for EPIC 1 — Gestão de Etapas.

Run from the repo root:
    uv run pytest backend/tests/test_stages.py -v
"""
import pytest

from app import create_app
from app.extensions import db as _db
from app.models.organization import Organization
from app.models.user import User
from app.models.project import Project
from app.models.project_client import ProjectClient
from app.models.stage import Stage
from app.models.task import Task
from app.services.stage_service import calculate_progress


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
def client(app):
    return app.test_client()


@pytest.fixture(scope="module")
def seeded(app):
    """Create one professional, one client, one project, and JWT tokens."""
    from flask_jwt_extended import create_access_token

    with app.app_context():
        org = Organization(name="Test Org")
        _db.session.add(org)
        _db.session.flush()

        pro = User(email="pro@test.com", role="professional", org_id=org.id, is_org_admin=True)
        pro.set_password("secret")

        cli = User(email="cli@test.com", role="client")
        cli.set_password("secret")

        _db.session.add_all([pro, cli])
        _db.session.flush()

        project = Project(name="Test Project", professional_id=pro.id, org_id=org.id, status="active")
        _db.session.add(project)
        _db.session.flush()

        # link client to project
        _db.session.add(ProjectClient(project_id=project.id, client_id=cli.id))
        _db.session.commit()

        pro_token = create_access_token(identity=str(pro.id))
        cli_token = create_access_token(identity=str(cli.id))

        return {
            "pro_id":    pro.id,
            "cli_id":    cli.id,
            "project_id": project.id,
            "pro_token":  pro_token,
            "cli_token":  cli_token,
        }


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ── calculate_progress ────────────────────────────────────────────────────────

def test_progress_no_tasks(app, seeded):
    with app.app_context():
        stage = Stage(name="Empty Stage", project_id=seeded["project_id"])
        _db.session.add(stage)
        _db.session.commit()
        assert calculate_progress(stage.id) == 0


def test_progress_partial(app, seeded):
    with app.app_context():
        stage = Stage(name="Partial Stage", project_id=seeded["project_id"])
        _db.session.add(stage)
        _db.session.flush()
        _db.session.add(Task(stage_id=stage.id, name="T1", is_done=True))
        _db.session.add(Task(stage_id=stage.id, name="T2", is_done=False))
        _db.session.add(Task(stage_id=stage.id, name="T3", is_done=False))
        _db.session.commit()
        assert calculate_progress(stage.id) == 33  # int(1/3 * 100)


def test_progress_all_done(app, seeded):
    with app.app_context():
        stage = Stage(name="Done Stage", project_id=seeded["project_id"])
        _db.session.add(stage)
        _db.session.flush()
        _db.session.add(Task(stage_id=stage.id, name="T1", is_done=True))
        _db.session.add(Task(stage_id=stage.id, name="T2", is_done=True))
        _db.session.commit()
        assert calculate_progress(stage.id) == 100


# ── POST /api/projects/<id>/stages ────────────────────────────────────────────

def test_create_stage_ok(client, seeded):
    resp = client.post(
        f"/api/projects/{seeded['project_id']}/stages",
        json={"name": "Foundation", "planned_start_date": "2026-04-01", "planned_end_date": "2026-04-30"},
        headers=auth(seeded["pro_token"]),
    )
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["name"] == "Foundation"
    assert data["status"] == "nao_iniciada"
    assert data["progress"] == 0


def test_create_stage_invalid_dates(client, seeded):
    resp = client.post(
        f"/api/projects/{seeded['project_id']}/stages",
        json={"name": "Bad Dates", "planned_start_date": "2026-05-01", "planned_end_date": "2026-04-01"},
        headers=auth(seeded["pro_token"]),
    )
    assert resp.status_code == 422


def test_create_stage_client_forbidden(client, seeded):
    resp = client.post(
        f"/api/projects/{seeded['project_id']}/stages",
        json={"name": "Should Fail"},
        headers=auth(seeded["cli_token"]),
    )
    assert resp.status_code == 403


def test_create_stage_no_auth(client, seeded):
    resp = client.post(
        f"/api/projects/{seeded['project_id']}/stages",
        json={"name": "No Token"},
    )
    assert resp.status_code == 401


# ── GET /api/projects/<id>/stages ─────────────────────────────────────────────

def test_list_stages_pro(client, seeded):
    resp = client.get(
        f"/api/projects/{seeded['project_id']}/stages",
        headers=auth(seeded["pro_token"]),
    )
    assert resp.status_code == 200
    assert isinstance(resp.get_json(), list)


def test_list_stages_client_member(client, seeded):
    resp = client.get(
        f"/api/projects/{seeded['project_id']}/stages",
        headers=auth(seeded["cli_token"]),
    )
    assert resp.status_code == 200


# ── PATCH /api/stages/<id>/status ────────────────────────────────────────────

def test_update_status_ok(client, app, seeded):
    with app.app_context():
        stage = Stage(name="Status Stage", project_id=seeded["project_id"])
        _db.session.add(stage)
        _db.session.commit()
        stage_id = stage.id

    resp = client.patch(
        f"/api/stages/{stage_id}/status",
        json={"status": "em_andamento"},
        headers=auth(seeded["pro_token"]),
    )
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "em_andamento"


def test_update_status_client_forbidden(client, app, seeded):
    with app.app_context():
        stage = Stage(name="Client Block Stage", project_id=seeded["project_id"])
        _db.session.add(stage)
        _db.session.commit()
        stage_id = stage.id

    resp = client.patch(
        f"/api/stages/{stage_id}/status",
        json={"status": "em_andamento"},
        headers=auth(seeded["cli_token"]),
    )
    assert resp.status_code == 403


def test_update_status_invalid_value(client, app, seeded):
    with app.app_context():
        stage = Stage(name="Invalid Status Stage", project_id=seeded["project_id"])
        _db.session.add(stage)
        _db.session.commit()
        stage_id = stage.id

    resp = client.patch(
        f"/api/stages/{stage_id}/status",
        json={"status": "invalid_value"},
        headers=auth(seeded["pro_token"]),
    )
    assert resp.status_code == 422
