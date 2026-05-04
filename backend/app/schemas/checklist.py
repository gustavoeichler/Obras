"""Marshmallow schemas for workflow checklist validation."""
from marshmallow import Schema, fields, validate, validates, ValidationError


class ChecklistItemCreateSchema(Schema):
    """Schema for creating checklist items."""
    description = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=500),
        allow_none=False
    )


class ChecklistItemToggleSchema(Schema):
    """Schema for toggling checklist item completion."""
    is_completed = fields.Bool(required=True)


class ChecklistItemSchema(Schema):
    """Schema for displayingchecklist items."""
    id = fields.Int(dump_only=True)
    stage_id = fields.Int(dump_only=True)
    description = fields.Str()
    is_completed = fields.Bool()
    completed_by_user_id = fields.Int(allow_none=True)
    completed_at = fields.DateTime(allow_none=True)
    created_at = fields.DateTime(dump_only=True)


class ChecklistItemListSchema(Schema):
    """Schema for listing checklist items."""
    items = fields.List(fields.Nested(ChecklistItemSchema))
    completion_pct = fields.Int()
