from marshmallow import Schema, fields, validate

# Legacy status values kept for the old /api/stages routes
STAGE_STATUSES_LEGACY = ["Não iniciada", "Em andamento", "Concluída", "Pausada"]

# New status values used by project-scoped routes (EPIC 1)
STAGE_STATUSES = ["nao_iniciada", "em_andamento", "concluida"]


class StageSchema(Schema):
    """Legacy schema — used by the standalone /api/stages/* routes."""
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    status = fields.Str(
        validate=validate.OneOf(STAGE_STATUSES_LEGACY),
        load_default="Não iniciada",
    )
    start_date         = fields.Date(load_default=None)
    end_date           = fields.Date(load_default=None)
    planned_start_date = fields.Date(load_default=None)
    planned_end_date   = fields.Date(load_default=None)
    total_expenses     = fields.Float(dump_only=True)
    progress           = fields.Float(dump_only=True)
    total_tasks        = fields.Int(dump_only=True)
    done_tasks         = fields.Int(dump_only=True)
    is_delayed         = fields.Bool(dump_only=True)


class ProjectStageSchema(Schema):
    """Schema for project-scoped stage routes (EPIC 1)."""
    id         = fields.Int(dump_only=True)
    project_id = fields.Int(dump_only=True)
    name       = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    status     = fields.Str(
        validate=validate.OneOf(STAGE_STATUSES),
        load_default="nao_iniciada",
    )
    planned_start_date = fields.Date(load_default=None)
    planned_end_date   = fields.Date(load_default=None)
    # computed, never stored
    progress   = fields.Int(dump_only=True)
    is_delayed = fields.Bool(dump_only=True)


class UpdateStageStatusSchema(Schema):
    status = fields.Str(
        required=True,
        validate=validate.OneOf(STAGE_STATUSES),
    )


class OrderProjectStagesSchema(Schema):
    """Schema for reordering stages within a project."""
    stage_ids = fields.List(
        fields.Int(),
        required=True,
        validate=validate.Length(min=1),
    )


class StageWorkflowSchema(Schema):
    """Full workflow snapshot for a stage (includes checklists, approvals, budget)."""
    id = fields.Int(dump_only=True)
    project_id = fields.Int(dump_only=True)
    name = fields.Str()
    status = fields.Str()
    order = fields.Int(allow_none=True)
    is_locked = fields.Bool()
    completion_pct = fields.Int()
    planned_start_date = fields.Date(allow_none=True)
    planned_end_date = fields.Date(allow_none=True)
    progress = fields.Int(dump_only=True)
    is_delayed = fields.Bool(dump_only=True)
    
    # Workflow elements
    checklists = fields.List(fields.Dict(), dump_only=True)
    approvals = fields.List(fields.Dict(), dump_only=True)
    can_complete = fields.Bool(dump_only=True)
    completion_blockers = fields.List(fields.Str(), dump_only=True)
    budgets = fields.List(fields.Dict(), dump_only=True)
