"""Tests for DailyReportNote CRUD routes."""
import pytest
from datetime import date

from app import create_app
from app.extensions import db as _db
from app.models.organization import Organization
from app.models.user import User
from app.models.project import Project
from app.models.stage import Stage
from app.models.task import Task
from app.models.daily_report import DailyReport


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
        org = Organization(name="RDO Org")
        _db.session.add(org)
        _db.session.flush()

        pro = User(email="pro@rdonotes.com", role="professional", org_id=org.id, is_org_admin=True)
        pro.set_password("secret")
        _db.session.add(pro)
        _db.session.flush()

        project = Project(name="Note Project", professional_id=pro.id, org_id=org.id, status="active")
        _db.session.add(project)
        _db.session.flush()

        stage = Stage(name="Foundation", project_id=project.id, status="nao_iniciada")
        _db.session.add(stage)
        _db.session.flush()

        task = Task(name="Pour concrete", stage_id=stage.id, project_id=project.id)
        _db.session.add(task)
        _db.session.flush()

        rdo = DailyReport(
            project_id=project.id,
            report_date=date.today(),
            created_by_user_id=pro.id,
        )
        _db.session.add(rdo)
        _db.session.commit()

        token = create_access_token(identity=str(pro.id))
        return {
            "token": token,
            "project_id": project.id,
            "stage_id": stage.id,
            "task_id": task.id,
            "rdo_id": rdo.id,
        }


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_add_stage_note(client, seeded):
    r = client.post(
        f"/api/projects/{seeded['project_id']}/daily-reports/{seeded['rdo_id']}/notes",
        json={"stage_id": seeded["stage_id"], "comment": "Checked formwork alignment"},
        headers=auth(seeded["token"]),
    )
    assert r.status_code == 201
    data = r.get_json()
    assert data["comment"] == "Checked formwork alignment"
    assert data["stage_id"] == seeded["stage_id"]
    assert data["task_id"] is None
    seeded["stage_note_id"] = data["id"]


def test_add_task_note(client, seeded):
    r = client.post(
        f"/api/projects/{seeded['project_id']}/daily-reports/{seeded['rdo_id']}/notes",
        json={"task_id": seeded["task_id"], "comment": "First batch done"},
        headers=auth(seeded["token"]),
    )
    assert r.status_code == 201
    data = r.get_json()
    assert data["task_id"] == seeded["task_id"]
    assert data["stage_id"] is None
    seeded["task_note_id"] = data["id"]


def test_add_note_missing_comment(client, seeded):
    r = client.post(
        f"/api/projects/{seeded['project_id']}/daily-reports/{seeded['rdo_id']}/notes",
        json={"stage_id": seeded["stage_id"]},
        headers=auth(seeded["token"]),
    )
    assert r.status_code == 422


def test_add_note_missing_target(client, seeded):
    """Neither stage_id nor task_id provided — should return 400."""
    r = client.post(
        f"/api/projects/{seeded['project_id']}/daily-reports/{seeded['rdo_id']}/notes",
        json={"comment": "General note with no target"},
        headers=auth(seeded["token"]),
    )
    assert r.status_code == 400
    data = r.get_json()
    assert "message" in data


def test_get_report_includes_rdo_notes(client, seeded):
    r = client.get(
        f"/api/projects/{seeded['project_id']}/daily-reports/{seeded['rdo_id']}",
        headers=auth(seeded["token"]),
    )
    assert r.status_code == 200
    body = r.get_json()
    assert "rdo_notes" in body
    assert len(body["rdo_notes"]) >= 2


def test_delete_note(client, seeded):
    r = client.delete(
        f"/api/projects/{seeded['project_id']}/daily-reports/{seeded['rdo_id']}/notes/{seeded['stage_note_id']}",
        headers=auth(seeded["token"]),
    )
    assert r.status_code == 204


def test_delete_note_wrong_report(client, seeded):
    r = client.delete(
        f"/api/projects/{seeded['project_id']}/daily-reports/9999/notes/{seeded['task_note_id']}",
        headers=auth(seeded["token"]),
    )
    assert r.status_code == 404
