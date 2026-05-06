from flask import abort

from app.extensions import db
from app.middleware.auth import check_project_access
from app.models.task import Task
from app.models.task_event import TaskEvent
from app.models.stage import Stage


def _stage_or_404(stage_id: int) -> Stage:
    return Stage.query.get_or_404(stage_id)


def _log_event(task: Task, action: str, user) -> None:
    db.session.add(TaskEvent(
        task_id=task.id,
        stage_id=task.stage_id,
        project_id=task.project_id,
        action=action,
        task_name=task.name,
        user_id=getattr(user, 'id', None),
    ))


def create_task(stage_id: int, data: dict, user) -> Task:
    stage = _stage_or_404(stage_id)

    if user.role != "professional":
        abort(403, "Apenas profissionais podem criar tarefas")
    if stage.project_id is None:
        abort(400, "Etapa não está vinculada a um projeto")

    check_project_access(stage.project_id, user)

    task = Task(
        name=data["name"],
        stage_id=stage_id,
        project_id=stage.project_id,
    )
    db.session.add(task)
    db.session.flush()
    _log_event(task, "created", user)
    db.session.commit()
    return task


def list_tasks(stage_id: int, user) -> list:
    stage = _stage_or_404(stage_id)
    check_project_access(stage.project_id, user)
    return Task.query.filter_by(stage_id=stage_id).order_by(Task.created_at).all()


def update_task(task_id: int, data: dict, user) -> Task:
    task = Task.query.get_or_404(task_id)

    if user.role != "professional":
        abort(403, "Apenas profissionais podem editar tarefas")

    check_project_access(task.project_id, user)

    old_done = task.is_done
    if "is_done" in data:
        task.is_done = data["is_done"]
    if "name" in data:
        task.name = data["name"]
    db.session.commit()

    if "is_done" in data:
        if data["is_done"] and not old_done:
            _log_event(task, "closed", user)
            db.session.commit()
        elif not data["is_done"] and old_done:
            _log_event(task, "reopened", user)
            db.session.commit()

    return task


def delete_task(task_id: int, user) -> None:
    task = Task.query.get_or_404(task_id)
    if user.role != "professional":
        abort(403, "Apenas profissionais podem remover tarefas")
    check_project_access(task.project_id, user)
    db.session.delete(task)
    db.session.commit()


def stage_progress(stage_id: int, user) -> dict:
    stage = _stage_or_404(stage_id)
    check_project_access(stage.project_id, user)
    tasks = Task.query.filter_by(stage_id=stage_id).all()
    total = len(tasks)
    done  = sum(1 for t in tasks if t.is_done)
    return {
        "stage_id":    stage_id,
        "total_tasks": total,
        "done_tasks":  done,
        "progress":    round((done / total) * 100, 1) if total > 0 else 0.0,
    }
