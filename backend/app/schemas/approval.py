"""Marshmallow schemas for workflow approval validation."""
from marshmallow import Schema, fields, validate, validates, ValidationError
from app.models.stage_approval import APPROVAL_ROLES


class ApprovalCreateSchema(Schema):
    """Schema for creating approval requirements."""
    required_role = fields.Str(
        required=True,
        validate=validate.OneOf(APPROVAL_ROLES),
    )


class ApprovalSubmitSchema(Schema):
    """Schema for submitting approval decisions."""
    status = fields.Str(
        required=True,
        validate=validate.OneOf(['approved', 'rejected']),
    )
    rejection_reason = fields.Str(
        allow_none=True,
        validate=validate.Length(max=500),
    )


class ApprovalSchema(Schema):
    """Schema for displaying approvals."""
    id = fields.Int(dump_only=True)
    stage_id = fields.Int(dump_only=True)
    required_role = fields.Str()
    status = fields.Str()
    approved_by_user_id = fields.Int(allow_none=True)
    approval_date = fields.DateTime(allow_none=True)
    rejection_reason = fields.Str(allow_none=True)
    created_at = fields.DateTime(dump_only=True)


class ApprovalListSchema(Schema):
    """Schema for listing approvals."""
    approvals = fields.List(fields.Nested(ApprovalSchema))
    can_complete = fields.Bool()
    completion_blockers = fields.List(fields.Str())
