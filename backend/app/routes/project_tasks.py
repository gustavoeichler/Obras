"""Project-scoped task routes.

GET    /api/stages/<stage_id>/tasks   — list tasks (pro + client member)
POST   /api/stages/<stage_id>/tasks   — create task (professional only)
PATCH  /api/tasks/<task_id>           — update task (professional only)
DELETE /api/tasks/<task_id>           — delete task (professional only)
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from marshmallow import ValidationError

from app.models.user import User
from app.schemas.task import TaskSchema, CreateTaskSchema, UpdateTaskSchema
from app.services import task_service

bp = Blueprint("project_tasks", __name__)

_dump   = TaskSchema()
_dump_m = TaskSchema(many=True)
_create = CreateTaskSchema()
_update = UpdateTaskSchema()


def _current_user():
    verify_jwt_in_request()
    return User.query.get_or_404(int(get_jwt_identity()))


@bp.get("/api/stages/<int:stage_id>/tasks")
def list_tasks(stage_id: int):
    user  = _current_user()
    tasks = task_service.list_tasks(stage_id, user)
    return jsonify(_dump_m.dump(tasks))


@bp.post("/api/stages/<int:stage_id>/tasks")
def create_task(stage_id: int):
    try:
        data = _create.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422

    user = _current_user()
    task = task_service.create_task(stage_id, data, user)
    return jsonify(_dump.dump(task)), 201


@bp.patch("/api/tasks/<int:task_id>")
def update_task(task_id: int):
    try:
        data = _update.load(request.get_json() or {}, partial=True)
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422

    user = _current_user()
    task = task_service.update_task(task_id, data, user)
    return jsonify(_dump.dump(task))


@bp.delete("/api/tasks/<int:task_id>")
def delete_task(task_id: int):
    user = _current_user()
    task_service.delete_task(task_id, user)
    return "", 204
