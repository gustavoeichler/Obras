from marshmallow import Schema, fields, validate


class _Nested(Schema):
    id   = fields.Int()
    name = fields.Str()


class BudgetSchema(Schema):
    id             = fields.Int(dump_only=True)
    category_id    = fields.Int(load_default=None)
    stage_id       = fields.Int(load_default=None)
    planned_amount = fields.Float(required=True, validate=validate.Range(min=0.01))
    created_at     = fields.DateTime(dump_only=True)

    # computed (dump-only)
    realized_amount = fields.Float(dump_only=True)
    remaining_amount = fields.Float(dump_only=True)
    percent_used    = fields.Float(dump_only=True)
    status          = fields.Str(dump_only=True)

    # nested
    category = fields.Nested(_Nested, dump_only=True)
    stage    = fields.Nested(_Nested, dump_only=True)
