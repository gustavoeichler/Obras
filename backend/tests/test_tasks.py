"""
Essential tests for EPIC 2 — Checklist (Tasks).

Run from the repo root:
    uv run pytest backend/tests/test_tasks.py -v
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
    from flask_jwt_extended import create_access_token

    with app.app_context():
        org = Organization(name="Tasks Org")
        _db.session.add(org)
        _db.session.flush()

        pro = User(email="pro@tasks.com", role="professional", org_id=org.id, is_org_admin=True)
        pro.set_password("secret")
        cli = User(email="cli@tasks.com", role="client")
        cli.set_password("secret")
        _db.session.add_all([pro, cli])
        _db.session.flush()

        project = Project(name="Task Project", professional_id=pro.id, org_id=org.id, status="active")
        _db.session.add(project)
        _db.session.flush()

        stage = Stage(name="Foundation", project_id=project.id, status="nao_iniciada")
        _db.session.add(stage)
        _db.session.flush()

        _db.session.add(ProjectClient(project_id=project.id, client_id=cli.id))
        _db.session.commit()

        return {
            "pro_id":    pro.id,
            "cli_id":    cli.id,
            "project_id": project.id,
            "stage_id":   stage.id,
            "pro_token":  create_access_token(identity=str(pro.id)),
            "cli_token":  create_access_token(identity=str(cli.id)),
        }


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ── POST /api/stages/<id>/tasks ────────────────────────────────────────────

def test_create_task_ok(client, seeded):
    resp = client.post(
        f"/api/stages/{seeded['stage_id']}/tasks",
        json={"name": "Escavar fundação"},
        headers=auth(seeded["pro_token"]),
    )
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["name"] == "Escavar fundação"
    assert data["is_done"] is False


def test_create_task_client_forbidden(client, seeded):
    resp = client.post(
        f"/api/stages/{seeded['stage_id']}/tasks",
        json={"name": "Should fail"},
        headers=auth(seeded["cli_token"]),
    )
    assert resp.status_code == 403


def test_create_task_no_auth(client, seeded):
    resp = client.post(
        f"/api/stages/{seeded['stage_id']}/tasks",
        json={"name": "No token"},
    )
    assert resp.status_code == 401


# ── GET /api/stages/<id>/tasks ─────────────────────────────────────────────

def test_list_tasks_pro(client, seeded):
    resp = client.get(
        f"/api/stages/{seeded['stage_id']}/tasks",
        headers=auth(seeded["pro_token"]),
    )
    assert resp.status_code == 200
    assert isinstance(resp.get_json(), list)


def test_list_tasks_client_member(client, seeded):
    resp = client.get(
        f"/api/stages/{seeded['stage_id']}/tasks",
        headers=auth(seeded["cli_token"]),
    )
    assert resp.status_code == 200


# ── PATCH /api/tasks/<id>/done ───────────────────────────────────────────────

def test_mark_task_done(client, app, seeded):
    with app.app_context():
        task = Task(
            name="Concrete pour",
            stage_id=seeded["stage_id"],
            project_id=seeded["project_id"],
        )
        _db.session.add(task)
        _db.session.commit()
        task_id = task.id

    resp = client.patch(
        f"/api/tasks/{task_id}",
        json={"is_done": True},
        headers=auth(seeded["pro_token"]),
    )
    assert resp.status_code == 200
    assert resp.get_json()["is_done"] is True


def test_mark_task_undone(client, app, seeded):
    with app.app_context():
        task = Task(
            name="Rebar install",
            stage_id=seeded["stage_id"],
            project_id=seeded["project_id"],
            is_done=True,
        )
        _db.session.add(task)
        _db.session.commit()
        task_id = task.id

    resp = client.patch(
        f"/api/tasks/{task_id}",
        json={"is_done": False},
        headers=auth(seeded["pro_token"]),
    )
    assert resp.status_code == 200
    assert resp.get_json()["is_done"] is False


def test_client_cannot_update_task(client, app, seeded):
    with app.app_context():
        task = Task(
            name="Client block test",
            stage_id=seeded["stage_id"],
            project_id=seeded["project_id"],
        )
        _db.session.add(task)
        _db.session.commit()
        task_id = task.id

    resp = client.patch(
        f"/api/tasks/{task_id}",
        json={"is_done": True},
        headers=auth(seeded["cli_token"]),
    )
    assert resp.status_code == 403


def test_update_task_missing_field(client, app, seeded):
    with app.app_context():
        task = Task(
            name="Validation test",
            stage_id=seeded["stage_id"],
            project_id=seeded["project_id"],
        )
        _db.session.add(task)
        _db.session.commit()
        task_id = task.id

    resp = client.patch(
        f"/api/tasks/{task_id}",
        json={"is_done": "not-a-bool"},
        headers=auth(seeded["pro_token"]),
    )
    assert resp.status_code == 422


# ── progress propagation (via stage_service) ─────────────────────────────────

def test_progress_reflects_done_tasks(app, seeded):
    from app.services.stage_service import calculate_progress

    with app.app_context():
        stage = Stage(name="Progress Stage", project_id=seeded["project_id"])
        _db.session.add(stage)
        _db.session.flush()
        _db.session.add(Task(stage_id=stage.id, project_id=seeded["project_id"], name="T1", is_done=True))
        _db.session.add(Task(stage_id=stage.id, project_id=seeded["project_id"], name="T2", is_done=True))
        _db.session.add(Task(stage_id=stage.id, project_id=seeded["project_id"], name="T3", is_done=False))
        _db.session.commit()

        assert calculate_progress(stage.id) == 66  # int(2/3 * 100)
