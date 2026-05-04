"""Project-scoped stage routes (EPIC 1 — Gestão de Etapas).

URL prefix: /api/projects/<project_id>/stages
All endpoints require a valid JWT.
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from marshmallow import ValidationError

from app.models.user import User
from app.schemas.stage import (
    ProjectStageSchema, UpdateStageStatusSchema, OrderProjectStagesSchema,
    StageWorkflowSchema
)
from app.schemas.checklist import ChecklistItemCreateSchema, ChecklistItemToggleSchema
from app.schemas.approval import ApprovalCreateSchema, ApprovalSubmitSchema
from app.services import stage_service
from app.services.checklist_service import ChecklistService
from app.services.approval_service import ApprovalService

bp = Blueprint("project_stages", __name__)

create_schema = ProjectStageSchema()
list_schema   = ProjectStageSchema(many=True)
status_schema = UpdateStageStatusSchema()
order_schema = OrderProjectStagesSchema()
workflow_schema = StageWorkflowSchema()
checklist_create_schema = ChecklistItemCreateSchema()
checklist_toggle_schema = ChecklistItemToggleSchema()
approval_create_schema = ApprovalCreateSchema()
approval_submit_schema = ApprovalSubmitSchema()


def _current_user():
    verify_jwt_in_request()
    return User.query.get_or_404(int(get_jwt_identity()))


@bp.get("/api/projects/<int:project_id>/stages")
def list_stages(project_id: int):
    user   = _current_user()
    stages = stage_service.list_project_stages(project_id, user)
    return jsonify(stages)


@bp.post("/api/projects/<int:project_id>/stages")
def create_stage(project_id: int):
    try:
        data = create_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422

    user  = _current_user()
    stage = stage_service.create_project_stage(project_id, data, user)
    return jsonify(stage_service._stage_to_dict(stage)), 201


@bp.patch("/api/stages/<int:stage_id>")
def update_stage(stage_id: int):
    user  = _current_user()
    stage = stage_service.update_stage(stage_id, request.get_json() or {}, user)
    return jsonify(stage_service._stage_to_dict(stage))


@bp.delete("/api/stages/<int:stage_id>")
def delete_stage(stage_id: int):
    user = _current_user()
    stage_service.delete_stage(stage_id, user)
    return "", 204


@bp.patch("/api/stages/<int:stage_id>/status")
def update_status(stage_id: int):
    try:
        data = status_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422

    user  = _current_user()
    stage = stage_service.update_stage_status(stage_id, data, user)
    return jsonify(stage_service._stage_to_dict(stage))


# ── Workflow ordering routes ──────────────────────────────────────────────────

@bp.patch("/api/projects/<int:project_id>/stages/order")
def reorder_stages(project_id: int):
    """Reorder stages within a project."""
    try:
        data = order_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    
    user = _current_user()
    stages = stage_service.order_project_stages(project_id, data["stage_ids"], user)
    return jsonify(stages)


@bp.patch("/api/stages/<int:stage_id>/lock")
def lock_stage(stage_id: int):
    """Lock a stage to prevent further edits."""
    user = _current_user()
    stage = stage_service.lock_stage(stage_id, user)
    return jsonify(stage_service._stage_to_dict(stage))


@bp.patch("/api/stages/<int:stage_id>/unlock")
def unlock_stage(stage_id: int):
    """Unlock a stage to allow edits."""
    user = _current_user()
    stage = stage_service.unlock_stage(stage_id, user)
    return jsonify(stage_service._stage_to_dict(stage))


@bp.get("/api/stages/<int:stage_id>/workflow")
def get_stage_workflow(stage_id: int):
    """Get full workflow snapshot for a stage."""
    user = _current_user()
    workflow = stage_service.get_stage_workflow(stage_id)
    return jsonify(workflow)


# ── Checklist routes ──────────────────────────────────────────────────────────

@bp.post("/api/stages/<int:stage_id>/checklists")
def create_checklist_item(stage_id: int):
    """Create a checklist item for a stage."""
    try:
        data = checklist_create_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    
    user = _current_user()
    item = ChecklistService.create_item(stage_id, data["description"])
    return jsonify(item), 201


@bp.get("/api/stages/<int:stage_id>/checklists")
def list_checklist_items(stage_id: int):
    """Get all checklist items for a stage."""
    user = _current_user()
    items = ChecklistService.get_stage_items(stage_id)
    completion_pct = ChecklistService.get_stage_completion_pct(stage_id)
    return jsonify({"items": items, "completion_pct": completion_pct})


@bp.patch("/api/checklists/<int:item_id>/toggle")
def toggle_checklist_item(item_id: int):
    """Toggle checklist item completion."""
    try:
        data = checklist_toggle_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    
    user = _current_user()
    item = ChecklistService.toggle_item(item_id, data["is_completed"], user.id)
    return jsonify(item)


@bp.delete("/api/checklists/<int:item_id>")
def delete_checklist_item(item_id: int):
    """Delete a checklist item."""
    user = _current_user()
    ChecklistService.delete_item(item_id)
    return "", 204


# ── Approval routes ──────────────────────────────────────────────────────────

@bp.post("/api/stages/<int:stage_id>/approvals")
def create_approval(stage_id: int):
    """Create an approval requirement for a stage."""
    try:
        data = approval_create_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    
    user = _current_user()
    approval = ApprovalService.create_approval(stage_id, data["required_role"])
    return jsonify(approval), 201


@bp.get("/api/stages/<int:stage_id>/approvals")
def list_approvals(stage_id: int):
    """Get all approvals for a stage."""
    user = _current_user()
    approvals = ApprovalService.get_stage_approvals(stage_id)
    can_complete, blockers = ApprovalService.can_complete_stage(stage_id)
    return jsonify({
        "approvals": approvals,
        "can_complete": can_complete,
        "completion_blockers": blockers
    })


@bp.patch("/api/approvals/<int:approval_id>/review")
def submit_approval_review(approval_id: int):
    """Submit an approval decision (approve or reject)."""
    try:
        data = approval_submit_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    
    user = _current_user()
    approval = ApprovalService.submit_approval(
        approval_id,
        data["status"],
        user.id,
        data.get("rejection_reason")
    )
    return jsonify(approval)


@bp.delete("/api/approvals/<int:approval_id>")
def delete_approval(approval_id: int):
    """Delete an approval requirement."""
    user = _current_user()
    ApprovalService.delete_approval(approval_id)
    return "", 204
