from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.middleware.auth import check_project_access
from app.models.expense import Expense
from app.models.project import Project
from app.models.project_client import ProjectClient
from app.models.stage import Stage
from app.models.task import Task
from app.models.user import User

bp = Blueprint("projects", __name__, url_prefix="/api/projects")

_VALID_STATUSES = {"active", "paused", "finished"}


def _to_dict(p: Project) -> dict:
    return {
        "id":              p.id,
        "name":            p.name,
        "description":     p.description,
        "status":          p.status,
        "budget_total":    p.budget_total,
        "area_m2":         p.area_m2,
        "professional_id": p.professional_id,
        "created_at":      p.created_at.isoformat() if p.created_at else None,
    }


@bp.post("/")
@jwt_required()
def create_project():
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)

    if user.role != "professional":
        return jsonify({"error": "Apenas profissionais podem criar projetos"}), 403

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name é obrigatório"}), 422

    status = data.get("status", "active")
    if status not in _VALID_STATUSES:
        return jsonify({"error": f"status deve ser: {', '.join(_VALID_STATUSES)}"}), 422

    project = Project(
        name            = name,
        description     = data.get("description"),
        status          = status,
        budget_total    = data.get("budget_total"),
        area_m2         = data.get("area_m2"),
        professional_id = user_id,
    )
    db.session.add(project)
    db.session.commit()
    return jsonify(_to_dict(project)), 201


@bp.get("/")
@jwt_required()
def list_projects():
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)

    if user.role == "professional":
        projects = (
            Project.query
            .filter_by(professional_id=user_id)
            .order_by(Project.created_at.desc())
            .all()
        )
    else:
        ids      = [l.project_id for l in ProjectClient.query.filter_by(client_id=user_id).all()]
        projects = (
            Project.query
            .filter(Project.id.in_(ids))
            .order_by(Project.created_at.desc())
            .all()
        )

    return jsonify([_to_dict(p) for p in projects])


@bp.get("/<int:project_id>")
@jwt_required()
def get_project(project_id: int):
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)
    project = Project.query.get_or_404(project_id)

    if user.role == "professional":
        if project.professional_id != user_id:
            return jsonify({"error": "Acesso negado"}), 403
    else:
        link = ProjectClient.query.filter_by(project_id=project_id, client_id=user_id).first()
        if not link:
            return jsonify({"error": "Acesso negado"}), 403

    return jsonify(_to_dict(project))


@bp.patch("/<int:project_id>")
@jwt_required()
def update_project(project_id: int):
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)
    project = check_project_access(project_id, user)

    if user.role != "professional":
        return jsonify({"error": "Apenas profissionais podem editar projetos"}), 403

    data = request.get_json(silent=True) or {}
    if "name" in data:
        name = data["name"].strip()
        if not name:
            return jsonify({"error": "name não pode ser vazio"}), 422
        project.name = name
    if "description" in data:
        project.description = data["description"]
    if "area_m2" in data:
        project.area_m2 = data["area_m2"]
    if "budget_total" in data:
        project.budget_total = data["budget_total"]
    if "status" in data:
        if data["status"] not in _VALID_STATUSES:
            return jsonify({"error": f"status deve ser: {', '.join(_VALID_STATUSES)}"}), 422
        project.status = data["status"]

    db.session.commit()
    return jsonify(_to_dict(project))


@bp.get("/<int:project_id>/stats")
@jwt_required()
def get_project_stats(project_id: int):
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)
    check_project_access(project_id, user)

    stages       = Stage.query.filter_by(project_id=project_id).all()
    stages_total = len(stages)
    stages_done  = sum(1 for s in stages if s.status == "concluida")

    if stages_total > 0:
        progresses = []
        for s in stages:
            total = Task.query.filter_by(stage_id=s.id).count()
            if total > 0:
                done = Task.query.filter_by(stage_id=s.id, is_done=True).count()
                progresses.append(int((done / total) * 100))
            else:
                progresses.append(0)
        progress_pct = round(sum(progresses) / stages_total)
    else:
        progress_pct = 0

    total_expenses = (
        db.session.query(db.func.sum(Expense.amount))
        .filter(Expense.project_id == project_id)
        .scalar()
    ) or 0.0

    return jsonify({
        "progress_pct":   progress_pct,
        "total_expenses": total_expenses,
        "stages_done":    stages_done,
        "stages_total":   stages_total,
    })


@bp.get("/<int:project_id>/expenses")
@jwt_required()
def get_project_expenses(project_id: int):
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)
    check_project_access(project_id, user)

    expenses = (
        Expense.query
        .filter_by(project_id=project_id)
        .order_by(Expense.date.desc())
        .all()
    )

    result = []
    for e in expenses:
        result.append({
            "id":            e.id,
            "amount":        e.amount,
            "date":          e.date.isoformat() if e.date else None,
            "description":   e.description,
            "stage_id":      e.stage_id,
            "stage_name":    e.stage.name if e.stage else None,
            "category_id":   e.category_id,
            "category_name": e.category.name if e.category else None,
        })

    return jsonify(result)
